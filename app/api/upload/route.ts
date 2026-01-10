import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { validateFileServer, validateFileSizeServer } from '@/lib/utils/server-file-validation'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Check authentication using Auth.js
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const customFilename = formData.get('customFilename') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    const sizeValidation = validateFileSizeServer(file.size)
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer for magic byte validation
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file using magic bytes
    const validation = await validateFileServer(buffer, file.name)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, detectedType: validation.detectedType },
        { status: 400 }
      )
    }

    // Create unique filename
    const filename = customFilename || file.name
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFilename = `${timestamp}-${sanitizedFilename}`

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Write file to local storage
    const filePath = path.join(uploadsDir, uniqueFilename)
    await writeFile(filePath, buffer)

    // Return the public URL
    const publicUrl = `/uploads/${uniqueFilename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: filename,
      detectedType: validation.detectedType,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
