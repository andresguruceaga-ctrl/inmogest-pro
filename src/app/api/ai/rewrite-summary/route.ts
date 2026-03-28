import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    console.log('[AI Rewrite] Received request with text length:', text?.length)

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Texto requerido' },
        { status: 400 }
      )
    }

    if (text.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'El texto es muy corto para mejorar (mínimo 10 caracteres)' },
        { status: 400 }
      )
    }

    // Try to use ZAI SDK
    try {
      // Dynamic import to handle potential missing config
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      
      console.log('[AI Rewrite] ZAI instance ready, sending request...')

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'Eres un experto en redacción profesional de informes inmobiliarios en español. Tu tarea es reescribir textos de forma más profesional, clara y estructurada. Mantén el significado original pero mejora la gramática, el estilo y la claridad. Responde SOLO con el texto mejorado, sin explicaciones ni comentarios adicionales.'
          },
          {
            role: 'user',
            content: `Reescribe el siguiente texto para un reporte inmobiliario profesional. Mantén el significado pero mejora la redacción, gramática y estilo:

"${text}"`
          }
        ],
        thinking: { type: 'disabled' }
      })

      console.log('[AI Rewrite] Received response from AI model')
      const improvedText = completion.choices?.[0]?.message?.content

      if (!improvedText) {
        console.error('[AI Rewrite] No improved text in response')
        return NextResponse.json(
          { success: false, error: 'No se pudo generar el texto mejorado' },
          { status: 500 }
        )
      }

      console.log('[AI Rewrite] Successfully improved text, length:', improvedText.length)
      return NextResponse.json({
        success: true,
        improvedText: improvedText.trim()
      })

    } catch (zaiError) {
      console.error('[AI Rewrite] ZAI SDK error:', zaiError)
      
      // Check if it's a configuration error
      const errorMessage = zaiError instanceof Error ? zaiError.message : 'Error desconocido'
      
      if (errorMessage.includes('Configuration file not found') || 
          errorMessage.includes('config') ||
          errorMessage.includes('invalid')) {
        console.log('[AI Rewrite] Using fallback - ZAI config not available')
        
        // Fallback: Return a simple improved version
        // Capitalize first letter, ensure proper sentence ending, fix common issues
        let improvedText = text.trim()
        
        // Capitalize first letter
        improvedText = improvedText.charAt(0).toUpperCase() + improvedText.slice(1)
        
        // Ensure proper ending
        if (!/[.!?]$/.test(improvedText)) {
          improvedText += '.'
        }
        
        // Fix double spaces
        improvedText = improvedText.replace(/\s+/g, ' ')
        
        return NextResponse.json({
          success: true,
          improvedText: improvedText,
          note: 'Mejora básica aplicada (IA no disponible en este momento)'
        })
      }
      
      throw zaiError
    }

  } catch (error) {
    console.error('[AI Rewrite] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[AI Rewrite] Error details:', errorMessage)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al procesar la solicitud de IA',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
