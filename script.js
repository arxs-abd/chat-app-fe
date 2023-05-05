// HTML Component
const login = document.querySelector('.user')
const findUser = document.querySelector('.find-user')
const containerUser = document.querySelector('.container-user')
const chatOutput = document.querySelector('.chat-output')
const inputMessage = document.querySelector('#text')
const sendMessageButton = document.querySelector('#send')
const chatUser = document.querySelector('#user-to')
const chatStatus = document.querySelector('#user-to-status')

// Environment
const dev = getEnv(window.location.href)
const BASEURL = dev ? 'http://localhost:3000' : 'https://zany-puce-lamb-cap.cyclic.app/'
inputMessage.value = 'Tes tes'
let socket_id

// Data
let data = getFromLocalStorage('user-data', {})
let message = getFromLocalStorage('message-data')
let contact = getFromLocalStorage('contact-data') 
let chatRoom = ''

// Check Is Login
if (data.username) {
    login.innerText = data.username

    // Create Conversation Id
    getAllConversation()
    
}

findUser.addEventListener('click', async function(e) {
    if (!data.username) return alert('Anda Harus Login')
    console.log(data)

    const username = prompt('Masukkan Username : ')
    const options = {
        method : 'GET',
        headers : {
          'Content-Type' : 'application/json',
          'Authorization' : 'Bearer ' + data.accessToken
        },
    }
    const result = await fetchJSON('/api/conversation/find?username=' + username, options)
    if (!result) return alert('Username tidak ditemukan')

    

    console.log(result)

})

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
    if (!result) return alert('Gagal, Silahkan Melakukan login ulang')
    alert(`Login dengan username ${result.data.username} Berhasil`)
    data = result.data
    data.accessToken = result.accessToken
    setFromLocalStorage('user-data', data)
    
    login.innerText = result.data.username

    getAllConversation()
})


const pusher = new Pusher('914eb719506342bd7d28', {
    cluster : 'ap1'
})
pusher.connection.bind('connected', () => {
    socket_id = pusher.connection.socket_id
})

const channel = pusher.subscribe('chat-room')

function listenChannel() {
    channel.bind(chatRoom, data => {
        console.log(data)
        createChatByOtherUser(data)
    })
}

// Component

inputMessage.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) sendMessageButton.click()
})

sendMessageButton.addEventListener('click', async function(e) {
    const userData = getFromLocalStorage('user-data', {})
    const id = userData.id
    const message = inputMessage.value
    const conversationId = sendMessageButton.dataset.id
    e.preventDefault()
    await fetchJSON('/api/chat', {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json',
          'x-socket-id' : socket_id,
          'Authorization' : 'Bearer ' + userData.accessToken
        },
        body : JSON.stringify({ conversationId, id, message})
    })
    inputMessage.value = ''
    const data = {
        created_at : new Date().toISOString(),
        message
    }
    createChatByUser(data)
})


function createChatByUser(msg) {
    const time = new Date(msg.created_at)

    const div = document.createElement('div')
    div.classList.add('chat', 'by-user')
    const divChat = document.createElement('div')
    divChat.classList.add('chat-text')
    const spanTxt = document.createElement('span')
    spanTxt.classList.add('chat-txt')
    spanTxt.textContent = msg.message

    const spanDate = document.createElement('span')
    spanDate.classList.add('chat-date')
    spanDate.textContent = formatter.format(time)
    
    divChat.appendChild(spanTxt)
    divChat.appendChild(spanDate)
    div.appendChild(divChat)
    chatOutput.appendChild(div)
    chatOutput.scrollBy(0, chatOutput.clientHeight)
}

function createChatByOtherUser(msg) {
    const time = new Date(msg.created_at)

    const div = document.createElement('div')
    div.classList.add('chat')
    const divChat = document.createElement('div')
    divChat.classList.add('chat-text')
    const spanTxt = document.createElement('span')
    spanTxt.classList.add('chat-txt')
    spanTxt.textContent = msg.message

    const spanDate = document.createElement('span')
    spanDate.classList.add('chat-date')
    spanDate.textContent = formatter.format(time)

    divChat.appendChild(spanTxt)
    divChat.appendChild(spanDate)
    div.appendChild(divChat)
    chatOutput.appendChild(div)
    chatOutput.scrollBy(0, chatOutput.clientHeight)
}

function createContact(contact) {
    const div = document.createElement('div')
    div.classList.add('item-card')

    const username = document.createElement('span')
    const lastChat = document.createElement('span')
    lastChat.classList.add('last-chat')

    username.innerText = contact.sender.username
    lastChat.innerText = 'Ini Chat Terakhir'

    div.appendChild(username)
    div.appendChild(lastChat)

    div.addEventListener('click', async function(e) {
        const options = {
            method : 'GET',
            headers : {
              'Content-Type' : 'application/json',
              'Authorization' : 'Bearer ' + data.accessToken
            },
        }
        const conversation = await fetchJSON('/api/conversation/message/' + contact.id_chat, options)
        sendMessageButton.dataset.id = contact.id_chat
        chatRoom = contact.id_chat

        listenChannel()
        chatUser.innerText = contact.sender.username
        
        const message = conversation.chat
        
        if (message.length === 0) removeChat()

        for (const chat of message) {
            if (chat.sender_id === data.id) createChatByUser(chat)
            else createChatByOtherUser(chat)
        }
    })

    containerUser.appendChild(div)
}

async function getAllConversation() {
    const options = {
        method : 'GET',
        headers : {
          'Content-Type' : 'application/json',
          'Authorization' : 'Bearer ' + data.accessToken
        },
    }
    const result = await fetchJSON('/api/conversation', options)

    const contact = result.data
    for (const user of contact) {
        createContact(user)
    }
}

function removeChat() {
    const allChat = document.querySelectorAll('.chat')

    for (const chat of allChat) chat.remove()
}