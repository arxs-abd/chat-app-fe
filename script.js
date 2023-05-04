const login = document.querySelector('.user')
const containerUser = document.querySelector('.container-user')
const chatOutput = document.querySelector('.chat-output')
const inputMessage = document.querySelector('#text')
const sendMessageButton = document.querySelector('#send')
const chatUser = document.querySelector('#user-to')
const chatStatus = document.querySelector('#user-to-status')

const dev = true
const BASEURL = dev ? 'http://localhost:3000' : 'https://zany-puce-lamb-cap.cyclic.app/'
inputMessage.value = 'Tes tes'

let formatter = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', 
    minute: '2-digit',
})

const userLogin = 'Aris'
const id = 'id' + Math.random().toString(16).slice(2)
let socket_id
login.innerText = userLogin

login.addEventListener('click', async function(e) {
    e.preventDefault()
    const username = prompt('Masukkan Username')
    const password = prompt('Masukkan Password')

    const options = {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({ username, password })
    }
    const result = await fetchJSON('/api/login', options)
    console.log(result)
})


const pusher = new Pusher('914eb719506342bd7d28', {
    cluster : 'ap1'
})
pusher.connection.bind('connected', () => {
    socket_id = pusher.connection.socket_id
})

const channel = pusher.subscribe('chat-room')
channel.bind('new-message', data => {
    const msg = data.message
    createChatByOtherUser(msg)
})

inputMessage.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) sendMessageButton.click()
})

sendMessageButton.addEventListener('click', async function(e) {
    const message = inputMessage.value
    e.preventDefault()
    await fetchJSON('/api/chat', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json',
          'x-socket-id' : socket_id
        },
        body : JSON.stringify({ id, message })
    })
    inputMessage.value = ''
    createChatByUser(message)
})


function createChatByUser(msg) {
    const div = document.createElement('div')
    div.classList.add('chat', 'by-user')
    const divChat = document.createElement('div')
    divChat.classList.add('chat-text')
    const spanTxt = document.createElement('span')
    spanTxt.classList.add('chat-txt')
    spanTxt.textContent = msg

    const spanDate = document.createElement('span')
    spanDate.classList.add('chat-date')
    spanDate.textContent = formatter.format(new Date())

    divChat.appendChild(spanTxt)
    divChat.appendChild(spanDate)
    div.appendChild(divChat)
    chatOutput.appendChild(div)
    chatOutput.scrollBy(0, chatOutput.clientHeight)
}

function createChatByOtherUser(msg) {
    const div = document.createElement('div')
    div.classList.add('chat')
    const divChat = document.createElement('div')
    divChat.classList.add('chat-text')
    const spanTxt = document.createElement('span')
    spanTxt.classList.add('chat-txt')
    spanTxt.textContent = msg

    const spanDate = document.createElement('span')
    spanDate.classList.add('chat-date')
    spanDate.textContent = formatter.format(new Date())

    divChat.appendChild(spanTxt)
    divChat.appendChild(spanDate)
    div.appendChild(divChat)
    chatOutput.appendChild(div)
    chatOutput.scrollBy(0, chatOutput.clientHeight)
}

// Utility

async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(BASEURL + url, options)
        if (!response.ok) throw new Error(response.statusText)
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching data:', error)
    }
}