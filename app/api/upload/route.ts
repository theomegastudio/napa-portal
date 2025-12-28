import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateFileServer, validateFileSizeServer } from '@/lib/utils/server-file-validation'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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

    // Upload to Supabase storage
    const filename = customFilename || file.name
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFilename = `${timestamp}-${sanitizedFilename}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resource-files')
      .upload(uniqueFilename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('resource-files')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
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
