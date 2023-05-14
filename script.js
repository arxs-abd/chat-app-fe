// HTML Component
const login = document.querySelector('.user')
const loginButton = document.querySelector('#login-button')
const findUser = document.querySelector('.find-user')
const container = document.querySelector('.container')
const containerLogin = document.querySelector('.container-login')
const containerUser = document.querySelector('.container-user')
const containerChat = document.querySelector('.container-chat')
const chatOutput = document.querySelector('.chat-output')
const inputMessage = document.querySelector('#text')
const sendMessageButton = document.querySelector('#send')
const chatUser = document.querySelector('#user-to')
const chatStatus = document.querySelector('#user-to-status')
const backButton = document.querySelector('#back')
const loading = document.querySelector('.loading')

// Environment
// const mobileWidth = 560
// const mobileWidth = 580
const mobileWidth = 580
const dev = getEnv(window.location.href)
const BASEURL = dev ? 'http://localhost:3001' : 'https://zany-puce-lamb-cap.cyclic.app/'
let socket_id
// Pusher.logToConsole = true

// Data
let data = getFromLocalStorage('user-data', {})
let message = getFromLocalStorage('message-data')
let contact = getFromLocalStorage('contact-data')
// let pusher
// let channel
let chatRoom = ''
let chatRoomBfr = ''
let IsMobile = false
let onlineUsers = {}

// IsMobile
checkMobile()
window.addEventListener('resize', function(e) {
    // checkMobile()
})

// Check Is Login
if (data.username) {
    login.innerText = data.username
    container.classList.remove('hidden')
    containerLogin.classList.add('hidden')
    // initPusher()
    getAllConversation()
    
}



findUser.addEventListener('click', async function(e) {
    if (!data.username) return alert('Anda Harus Login')

    const username = prompt('Masukkan Username : ')
    const options = {
        method : 'GET',
        headers : {
          'Content-Type' : 'application/json',
          'Authorization' : 'Bearer ' + data.accessToken
        },
    }
    const result = await fetchJSON('/api/conversation/find?username=' + username, options)
    if (!result) return

    getAllConversation()

})

loginButton.addEventListener('click', async function(e) {
    e.preventDefault()
    loading.classList.remove('hidden')
    containerLogin.classList.add('hidden')
    
    const username = document.querySelector('input[name="username"]').value
    const password = document.querySelector('input[name="password"]').value

    const options = {
        method : 'POST',
        headers : {
          'Content-Type' : 'application/json'
        },
        body : JSON.stringify({ username, password })
    }
    const result = await fetchJSON('/api/login', options)
    if (!result) return
    data = result.data
    data.accessToken = result.accessToken
    setFromLocalStorage('user-data', data)
    
    login.innerText = result.data.username
    // initPusher()
    getAllConversation()
    container.classList.remove('hidden')
    loading.classList.add('hidden')
})

login.addEventListener('click', function() {
    localStorage.removeItem('user-data')

    container.classList.add('hidden')
    containerLogin.classList.remove('hidden')
})

login.addEventListener('mouseover', function() {
    login.innerText = 'logout'
})
login.addEventListener('mouseout', function() {
    login.innerText = data.username
})

// Pusher Configuration

const pusher = new Pusher('914eb719506342bd7d28', {
    cluster : 'ap1', 
    authEndpoint : BASEURL + '/pusher/auth',
    auth : {
        params : {
            user_id : data.id,
            username : data.username
        }
    }
})

pusher.connection.bind('connected', async () => {
    socket_id = pusher.connection.socket_id
})

const channel = pusher.subscribe('presence-chat-room')

channel.bind('pusher:subscription_succeeded', () => {
    onlineUsers = channel.members.members
})

channel.bind('pusher:member_added', (member) => {
    const idNow = chatUser.dataset.id
    if (!onlineUsers.hasOwnProperty(member.id)) onlineUsers[idNow] = null
    if (idNow === member.id) chatStatus.innerText = 'Online'
})
channel.bind("pusher:member_removed", (member) => {
    const idNow = chatUser.dataset.id
    delete onlineUsers[member]
    if (idNow === member.id) chatStatus.innerText = 'Offline'
})

function listenChannel() {

    if (chatRoomBfr !== '') channel.unbind(chatRoomBfr)
    channel.bind(chatRoom, data => {
        createChatByOtherUser(data)
    })
}

// Component

inputMessage.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) sendMessageButton.click()
})

sendMessageButton.addEventListener('click', async function(e) {
    const userData = getFromLocalStorage('user-data', {})

    if (inputMessage.value === '') return

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

backButton.addEventListener('click', function(e) {
    containerChat.classList.add('hidden')
    containerUser.classList.remove('hidden')
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
        chatRoomBfr = chatRoom + ''
        chatRoom = contact.id_chat
        
        
        removeSelectedContact()
        removeChat()
        
        if (!div.classList.contains('selected')) div.classList.add('selected')
        
        listenChannel()
        chatUser.innerText = contact.sender.username
        chatUser.dataset.id = contact.sender.id

        if (onlineUsers.hasOwnProperty(contact.sender.id)) chatStatus.innerText = 'Online'
        else chatStatus.innerText = 'Offline'
        
        const message = conversation.chat
        const msgByTime = {}

        for (const chat of message) {
            const date = new Date(chat.created_at)
            const day = date.getDate()
            const month = date.getMonth()
            const year = date.getFullYear()
            const newDate = new Date(`${year}-${month}-${day}`)

            if (!msgByTime[newDate]) msgByTime[newDate] = []
            msgByTime[newDate].push(chat)
        }

        for (const timeChat in msgByTime) {
            createTimeDiv(timeChat)
            for (const chat of msgByTime[timeChat]) {
                    if (chat.sender_id === data.id) createChatByUser(chat)
                    else createChatByOtherUser(chat)
                }
        }
        
        if (message.length === 0) removeChat()

        chatOutput.scrollTop = chatOutput.scrollHeight - chatOutput.offsetHeight;
        // chatOutput.scrollBy(0, chatOutput.clientHeight)
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

    removeContact()

    for (const user of contact) {
        createContact(user)
    }
}

function removeChat() {
    const allChat = document.querySelectorAll('.chat')
    const allTime = document.querySelectorAll('.date-chat')

    for (const chat of allChat) chat.remove()
    for (const time of allTime) time.remove()
}

function removeContact() {
    const allContact = document.querySelectorAll('.item-card')

    for (const contact of allContact) contact.remove()
}

function removeSelectedContact() {
    const allContact = document.querySelectorAll('.item-card')

    for (const contact of allContact) if (contact.classList.contains('selected')) contact.classList.remove('selected')
}

function initPusher() {
    pusher = new Pusher('914eb719506342bd7d28', {
        cluster : 'ap1', 
        authEndpoint : BASEURL + '/pusher/auth',
        auth : {
            params : {
                user_id : data.id,
                username : data.username
            }
        }
    })

    pusher.connection.bind('connected', async () => {
        socket_id = pusher.connection.socket_id
    })

    channel = pusher.subscribe('presence-chat-room')

    channel.bind('pusher:subscription_succeeded', () => {
        onlineUsers = channel.members.members
    })

    channel.bind('pusher:member_added', (member) => {
        const idNow = chatUser.dataset.id
        if (!onlineUsers.hasOwnProperty(member.id)) onlineUsers[idNow] = null
        if (idNow === member.id) chatStatus.innerText = 'Online'
    })
    channel.bind("pusher:member_removed", (member) => {
        const idNow = chatUser.dataset.id
        delete onlineUsers[member]
        if (idNow === member.id) chatStatus.innerText = 'Offline'
    })
}

function checkMobile() {
    if (window.innerWidth < mobileWidth) {
        IsMobile = true
        if (!containerChat.classList.contains('hidden')) containerChat.classList.add('hidden')
        if (backButton.style.display !== 'flex') backButton.style.display = 'flex'
    } else {
        IsMobile = false
        if (containerChat.classList.contains('hidden')) containerChat.classList.remove('hidden')
        if (containerUser.classList.contains('hidden')) containerUser.classList.remove('hidden')
        if (backButton.style.display !== 'none') backButton.style.display = 'none'

    }
}

function createTimeDiv(time) {
    const f = new Intl.RelativeTimeFormat('id-ID', {
        style : 'long',
        numeric : 'auto'
    })
    const today = new Date()
    // const before = new Date('2023-5-3')
    const before = new Date(time)
    const span = document.createElement('span')
    span.classList.add('date-chat')
    const minDay = before.getDate() - today.getDate()
    if (minDay > 0 || minDay < -7) span.innerText = formatterTimeDivisionDate.format(before)
    else if (minDay <= -3 && minDay >= -7) span.innerText = formatterTimeDivisionDay.format(before)
    else if (minDay <= 0 && minDay >= -2) span.innerText = f.format(minDay, 'days')
    // else span.innerText = f.format(before - today, 'days')
    // else if (minDay <= -1) span.innerText = f.format(minDay, 'days')
    chatOutput.appendChild(span)
}