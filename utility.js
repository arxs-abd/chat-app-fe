let formatter = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', 
    minute: '2-digit',
})

let formatterTimeDivisionDate = new Intl.DateTimeFormat('id-ID', {
    month : 'long',
    day : '2-digit',
    year : 'numeric'
})
let formatterTimeDivisionDay = new Intl.DateTimeFormat('id-ID', {
    weekday : 'long'
})

// Utility Function

async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(BASEURL + url, options)
        if (!response.ok) {
            const data = await response.json()
            return alert(data.msg)
            // return alert(response.text())
            // throw new Error(response.statusText)
        }
        const data = await response.json()
        return data
    } catch (error) {
        console.log(error)
    }
}

function getEnv(url) {
    if (url.split('//')[0] === 'http:') return true
    return false
}

function getFromLocalStorage(key, falseResult = []) {
    return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : falseResult
}

function setFromLocalStorage(key, value) {
    return localStorage.setItem(key, JSON.stringify(value))
}

async function getNotifPermission() {
    return await Notification.requestPermission()
}

function sendNotification(msg) {
    let title = 'New Message'
    let body = 'Pesan dari Teman anda yaitu : ' + msg.message;
    let notification = new Notification(title, { body });
    notification.onclick = () => {
        notification.close()
        window.parent.focus()
    }
}