'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Upload, Download, Send, FileSpreadsheet } from 'lucide-react'
import Papa from 'papaparse'
import { saveAs } from 'file-saver'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface CatalogData {
  headers: string[]
  rows: any[][]
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m JARVIS, your personal AI agent. I can help you with daily tasks and manage your e-commerce catalogs for Amazon, Flipkart, Meesho, and Myntra. Upload your catalog sheet or speak to me!' }
  ])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null)
  const [referenceData, setReferenceData] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript
          setInput(prev => prev + ' ' + transcript)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }
      }
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleCatalogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.data[0] as string[]
          const rows = results.data.slice(1) as any[][]
          setCatalogData({ headers, rows })
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Catalog uploaded successfully! Found ${rows.length} products with ${headers.length} columns. Columns: ${headers.join(', ')}`
          }])
        }
      },
      error: (error) => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error uploading catalog: ${error.message}`
        }])
      }
    })
  }

  const sendMessage = async () => {
    if (!input.trim() && !catalogData) return

    const userMessage = input.trim()
    setInput('')

    if (userMessage) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          catalogData,
          referenceData
        })
      })

      const data = await response.json()

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error}`
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }])

        if (data.updatedCatalog) {
          setCatalogData(data.updatedCatalog)
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      }])
    }

    setIsProcessing(false)
  }

  const downloadCatalog = () => {
    if (!catalogData) return

    const csv = Papa.unparse({
      fields: catalogData.headers,
      data: catalogData.rows
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `catalog_${Date.now()}.csv`)
  }

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.1
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          fontSize: '3rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          JARVIS AI Agent
        </h1>
        <p style={{ color: '#aaa', fontSize: '1.1rem' }}>
          Your Personal Assistant for Daily Tasks & E-Commerce Catalog Management
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} />
            Upload Catalog Sheet (CSV)
          </h3>
          <label style={{
            display: 'block',
            padding: '15px',
            background: 'rgba(102, 126, 234, 0.1)',
            border: '2px dashed #667eea',
            borderRadius: '10px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}>
            <Upload size={32} style={{ margin: '0 auto 10px' }} />
            <div>Click to upload CSV file</div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCatalogUpload}
              style={{ display: 'none' }}
            />
          </label>
          {catalogData && (
            <div style={{ marginTop: '15px', color: '#4ade80' }}>
              ✓ Catalog loaded: {catalogData.rows.length} products
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ marginBottom: '15px' }}>Reference Data / Raw Data</h3>
          <textarea
            value={referenceData}
            onChange={(e) => setReferenceData(e.target.value)}
            placeholder="Paste your raw product data here for reference..."
            style={{
              width: '100%',
              height: '100px',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              resize: 'none'
            }}
          />
        </div>
      </div>

      <div style={{
        flex: 1,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '20px',
        overflowY: 'auto',
        maxHeight: '500px',
        backdropFilter: 'blur(10px)'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '15px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 18px',
                borderRadius: '15px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                cursor: msg.role === 'assistant' ? 'pointer' : 'default'
              }}
              onClick={() => msg.role === 'assistant' && speak(msg.content)}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div style={{ color: '#667eea', fontStyle: 'italic' }}>
            JARVIS is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <button
          onClick={toggleListening}
          style={{
            padding: '15px',
            borderRadius: '50%',
            border: 'none',
            background: isListening
              ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            boxShadow: isListening ? '0 0 20px rgba(245, 87, 108, 0.6)' : 'none'
          }}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message or use voice..."
          style={{
            flex: 1,
            padding: '15px 20px',
            borderRadius: '25px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '1rem',
            outline: 'none'
          }}
        />

        <button
          onClick={sendMessage}
          disabled={isProcessing}
          style={{
            padding: '15px 25px',
            borderRadius: '25px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1rem',
            transition: 'all 0.3s',
            opacity: isProcessing ? 0.6 : 1
          }}
        >
          <Send size={20} />
          Send
        </button>

        {catalogData && (
          <button
            onClick={downloadCatalog}
            style={{
              padding: '15px 25px',
              borderRadius: '25px',
              border: 'none',
              background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
          >
            <Download size={20} />
            Export
          </button>
        )}
      </div>
    </div>
  )
}
