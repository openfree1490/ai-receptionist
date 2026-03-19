;(function () {
  'use strict'

  // ── Config ──────────────────────────────────────────────────────────────────
  const script =
    document.currentScript ||
    document.querySelector('script[data-client-id]')

  if (!script) return

  const CLIENT_ID = script.getAttribute('data-client-id')
  const SERVER_URL = script.getAttribute('data-server-url') ||
    script.src.replace(/\/widget\.js.*$/, '')

  if (!CLIENT_ID) {
    console.warn('[AI Receptionist Widget] data-client-id is required')
    return
  }

  // ── State ───────────────────────────────────────────────────────────────────
  let conversationId = null
  let isOpen = false
  let isStreaming = false

  // ── Styles ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    #air-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      z-index: 999998;
      transition: transform .15s, background .15s;
    }
    #air-bubble:hover { background: #4338ca; transform: scale(1.08); }

    #air-window {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 360px;
      max-width: calc(100vw - 48px);
      height: 500px;
      max-height: calc(100vh - 120px);
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.15);
      display: flex;
      flex-direction: column;
      z-index: 999999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      transition: opacity .15s, transform .15s;
    }
    #air-window.hidden { opacity: 0; transform: translateY(12px); pointer-events: none; }

    #air-header {
      background: #4f46e5;
      color: #fff;
      padding: 14px 16px;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #air-header button {
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0 4px;
      opacity: .8;
    }
    #air-header button:hover { opacity: 1; }

    #air-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .air-msg {
      max-width: 80%;
      padding: 9px 13px;
      border-radius: 14px;
      line-height: 1.45;
      font-size: 13.5px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .air-msg.user {
      align-self: flex-end;
      background: #4f46e5;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .air-msg.assistant {
      align-self: flex-start;
      background: #f1f5f9;
      color: #1a202c;
      border-bottom-left-radius: 4px;
    }
    .air-msg.typing {
      color: #718096;
      font-style: italic;
    }

    #air-form {
      padding: 10px 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
    }
    #air-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      outline: none;
      font-size: 13.5px;
      font-family: inherit;
      resize: none;
      line-height: 1.4;
    }
    #air-input:focus { border-color: #4f46e5; }
    #air-send {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #4f46e5;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      align-self: flex-end;
    }
    #air-send:disabled { background: #a5b4fc; cursor: not-allowed; }
    #air-send:not(:disabled):hover { background: #4338ca; }

    #air-powered {
      text-align: center;
      font-size: 10px;
      color: #a0aec0;
      padding: 4px;
    }
  `
  document.head.appendChild(style)

  // ── DOM ─────────────────────────────────────────────────────────────────────
  const bubble = document.createElement('button')
  bubble.id = 'air-bubble'
  bubble.innerHTML = '💬'
  bubble.setAttribute('aria-label', 'Open chat')

  const win = document.createElement('div')
  win.id = 'air-window'
  win.classList.add('hidden')
  win.innerHTML = `
    <div id="air-header">
      <span>Chat with us</span>
      <button id="air-close" aria-label="Close">×</button>
    </div>
    <div id="air-messages"></div>
    <form id="air-form" autocomplete="off">
      <textarea id="air-input" rows="1" placeholder="Type a message…"></textarea>
      <button type="submit" id="air-send" aria-label="Send">➤</button>
    </form>
    <div id="air-powered">Powered by AI Receptionist</div>
  `

  document.body.appendChild(bubble)
  document.body.appendChild(win)

  const messagesEl = win.querySelector('#air-messages')
  const inputEl = win.querySelector('#air-input')
  const sendEl = win.querySelector('#air-send')
  const form = win.querySelector('#air-form')

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function toggleWindow(open) {
    isOpen = open
    win.classList.toggle('hidden', !open)
    bubble.innerHTML = open ? '✕' : '💬'
    if (open) inputEl.focus()
  }

  function addMessage(role, text) {
    const el = document.createElement('div')
    el.className = `air-msg ${role}`
    el.textContent = text
    messagesEl.appendChild(el)
    messagesEl.scrollTop = messagesEl.scrollHeight
    return el
  }

  function setStreaming(active) {
    isStreaming = active
    sendEl.disabled = active
  }

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  inputEl.addEventListener('input', function () {
    this.style.height = 'auto'
    this.style.height = Math.min(this.scrollHeight, 100) + 'px'
  })

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim()
    if (!text || isStreaming) return

    inputEl.value = ''
    inputEl.style.height = 'auto'
    addMessage('user', text)
    setStreaming(true)

    const assistantEl = addMessage('assistant', '…')
    assistantEl.classList.add('typing')

    let buffer = ''
    let firstChunk = true

    try {
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: CLIENT_ID, message: text, conversationId }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let partial = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        partial += decoder.decode(value, { stream: true })
        const lines = partial.split('\n')
        partial = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue

          let parsed
          try { parsed = JSON.parse(data) } catch { continue }

          if (parsed.error) {
            assistantEl.textContent = 'Sorry, something went wrong. Please try again.'
            assistantEl.classList.remove('typing')
            break
          }

          if (parsed.text) {
            if (firstChunk) {
              assistantEl.textContent = ''
              assistantEl.classList.remove('typing')
              firstChunk = false
            }
            buffer += parsed.text
            assistantEl.textContent = buffer
            messagesEl.scrollTop = messagesEl.scrollHeight
          }

          if (parsed.done) {
            if (parsed.conversationId) conversationId = parsed.conversationId
          }
        }
      }
    } catch (err) {
      console.error('[AI Widget]', err)
      assistantEl.textContent = 'Connection error. Please try again.'
      assistantEl.classList.remove('typing')
    } finally {
      setStreaming(false)
      inputEl.focus()
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  bubble.addEventListener('click', () => toggleWindow(!isOpen))
  win.querySelector('#air-close').addEventListener('click', () => toggleWindow(false))

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    sendMessage()
  })

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !win.contains(e.target) && e.target !== bubble) {
      toggleWindow(false)
    }
  })
})()
