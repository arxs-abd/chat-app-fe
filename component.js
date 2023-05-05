findUser.addEventListener('click', function(e) {
    if (!data.username) return alert('Anda Harus Login')

    const username = prompt('Masukkan Username : ')
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
    if (!result) {
        return alert('Gagal, Silahkan Melakukan login ulang')
    }
    alert(`Login dengan username ${result.data.username} Berhasil`)
    data = result.data
    setFromLocalStorage('user-data', data)
    
    login.innerText = result.data.username
})

// Component

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
        body : JSON.stringify({ message })
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