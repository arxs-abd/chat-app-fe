// HTML Component
const login = document.querySelector(".user");
const formLogin = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const findUser = document.querySelector(".find-user");
const callUser = document.querySelector("#call");
const container = document.querySelector(".container");
const containerLogin = document.querySelector(".container-login");
const containerUser = document.querySelector(".container-user");
const containerChat = document.querySelector(".container-chat");
const chatOutput = document.querySelector(".chat-output");
const inputMessage = document.querySelector("#text");
const sendMessageButton = document.querySelector("#send");
const chatUser = document.querySelector("#user-to");
const chatStatus = document.querySelector("#user-to-status");
const backButton = document.querySelector("#back");
const loading = document.querySelector(".loading");
const addFriendModal = document.querySelector("#addFreindModal");
const callModal = document.querySelector("#callModal");
const closeModal = document.querySelector(".close");
const userToCall = document.querySelector('#call-name')
const closeCallModal = document.querySelector("#stop-call");
const acceptCallModal = document.querySelector("#accept-call");
const rejectCallModal = document.querySelector("#reject-call");
const callContainer = document.querySelector("#call-container");
const answerContainer = document.querySelector("#answer-container");
const callStatus = document.querySelector("#call-status");

// Environment
// const mobileWidth = 560
// const mobileWidth = 580
const mobileWidth = 580;
const dev = getEnv(window.location.href);
// const dev = false;
const BASEURL = dev
  ? "http://localhost:3001"
  : "https://zany-puce-lamb-cap.cyclic.app/";
let socket_id;
// Pusher.logToConsole = true

// Data
let data = getFromLocalStorage("user-data", {});
let message = getFromLocalStorage("message-data");
let contact = getFromLocalStorage("contact-data");
let focus = true;
// let pusher
let channel
let channelCall
let callTimer
let chatRoom = "";
let chatRoomBfr = "";
let IsMobile = false;
let onlineUsers = {};

// // IsMobile
// checkMobile()
// window.addEventListener('resize', function(e) {
//     checkMobile()
// })

// Livekit
const {
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RoomEvent,
} = LivekitClient

const room = new LivekitClient.Room({
  audioCaptureDefaults: {
      autoGainControl: true,
      deviceId: '',
      echoCancellation: true,
      noiseSuppression: true,
  },
  videoCaptureDefaults: {
      deviceId: '',
      facingMode: 'user',
      resolution: {
          width: 640,
          height: 360,
          frameRate: 30,
      },
  },
  publishDefaults: {
      videoEncoding: {
          maxBitrate: 1_500_000,
          maxFramerate: 30,
      },
      screenShareEncoding: {
          maxBitrate: 1_500_000,
          maxFramerate: 30,
      },
      audioBitrate: 20_000,
      dtx: true,
  },
})
const livekitUrl = 'wss://chat-app-oluzbac4.livekit.cloud'
room
    .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange)
    .on(RoomEvent.Disconnected, handleDisconnect)
    .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
    .on(RoomEvent.TrackPublished, handleTrackPublished)

let notifPermission = getNotifPermission();
// let micPermission = getMicPermission()

// Check Is Login
if (data.username) {
  login.innerText = data.username;
  container.classList.remove("hidden");
  containerLogin.classList.add("hidden");
  initPusher();
  getAllConversation()
}

findUser.addEventListener("click", async function (e) {
  if (!data.username) return alert("Anda Harus Login");
  // addFriendModal.style.display = "flex";
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
});

closeModal.addEventListener("click", function () {
  addFriendModal.style.display = "none";
});

window.onclick = function (event) {
  if (event.target == addFriendModal) {
    addFriendModal.style.display = "none";
  }
};

formLogin.addEventListener("submit", async function (e) {
  await loginApp(e);
});

loginButton.addEventListener("click", async function (e) {
  await loginApp(e);
});

login.addEventListener("click", function () {
  localStorage.removeItem("user-data");

  container.classList.add("hidden");
  containerLogin.classList.remove("hidden");
});

login.addEventListener("mouseover", function () {
  login.innerText = "logout";
});
login.addEventListener("mouseout", function () {
  login.innerText = data.username;
});

function listenChannel() {
  if (chatRoomBfr !== "") channel.unbind(chatRoomBfr);
  channel.bind(chatRoom, (data) => {
    createChatByOtherUser(data);
    // if (document.visibilityState === 'hidden') return sendNotification(data)
    if (!focus) sendNotification(data);
    // window.onblur = function(e) {
    //     return sendNotification(data)
    // }
  });
}

function listenCall(id) {
  showMessage('listen dengan id', id)
  if (!id) return
  channelCall.bind(id, async (result) => {
    showMessage(result)
    if (result?.statusCall) {
      showMessage(result.statusCall)
      callModal.style.display = 'none'
      await room.disconnect()  
    } else {
      callStatus.innerText = 'Memanggil'
      callModal.style.display = 'flex'
      userToCall.innerText = result.user
      showMessage('jalan')
      if (answerContainer.classList.contains('hidden')) answerContainer.classList.remove('hidden')
      if (!closeCallModal.classList.contains('hidden')) closeCallModal.classList.add('hidden')

      rejectCallModal.addEventListener('click', async function() {
        callModal.style.display = 'none'

        await fetchJSON("/api/rejectCall", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-socket-id": socket_id,
            Authorization: "Bearer " + data.accessToken,
          },
          body: JSON.stringify({ conversationId : id, }),
        });

        await room.disconnect()
      })

      acceptCallModal.addEventListener('click', async function() {
        await connectRoom(id)
        if (!answerContainer.classList.contains('hidden')) answerContainer.classList.add('hidden')
        if (closeCallModal.classList.contains('hidden')) closeCallModal.classList.remove('hidden')
      })
    }
  });
}

// Component

inputMessage.addEventListener("keydown", function (e) {
  if (e.keyCode === 13) sendMessageButton.click();
});

sendMessageButton.addEventListener("click", async function (e) {
  e.preventDefault();
  const userData = getFromLocalStorage("user-data", {});

  if (inputMessage.value === "") return;

  const id = userData.id;
  const message = inputMessage.value;
  const conversationId = sendMessageButton.dataset.id;
  await fetchJSON("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-socket-id": socket_id,
      Authorization: "Bearer " + userData.accessToken,
    },
    body: JSON.stringify({ conversationId, id, message }),
  });
  inputMessage.value = "";
  const data = {
    created_at: new Date().toISOString(),
    message,
  };
  const allDate = document.querySelectorAll(".date-chat");
  const lastDate = allDate.item(allDate.length - 1)?.innerText || 'Hari Ini';
  if (lastDate !== "Hari Ini") createTimeDiv(new Date());
  createChatByUser(data);
});

// backButton.addEventListener("click", function (e) {
//   containerChat.classList.add("hidden");
//   containerUser.classList.remove("hidden");
// });

function createChatByUser(msg) {
  const time = new Date(msg.created_at);

  const div = document.createElement("div");
  div.classList.add("chat", "by-user");
  const divChat = document.createElement("div");
  divChat.classList.add("chat-text");
  const spanTxt = document.createElement("span");
  spanTxt.classList.add("chat-txt");
  spanTxt.textContent = msg.message;

  const spanDate = document.createElement("span");
  spanDate.classList.add("chat-date");
  spanDate.textContent = formatter.format(time);

  divChat.appendChild(spanTxt);
  divChat.appendChild(spanDate);
  div.appendChild(divChat);
  chatOutput.appendChild(div);
  chatOutput.scrollBy(0, chatOutput.clientHeight);
}

function createChatByOtherUser(msg) {
  const time = new Date(msg.created_at);

  const div = document.createElement("div");
  div.classList.add("chat");
  const divChat = document.createElement("div");
  divChat.classList.add("chat-text");
  const spanTxt = document.createElement("span");
  spanTxt.classList.add("chat-txt");
  spanTxt.textContent = msg.message;

  const spanDate = document.createElement("span");
  spanDate.classList.add("chat-date");
  spanDate.textContent = formatter.format(time);

  divChat.appendChild(spanTxt);
  divChat.appendChild(spanDate);
  div.appendChild(divChat);
  chatOutput.appendChild(div);
  chatOutput.scrollBy(0, chatOutput.clientHeight);
}

function createContact(contact) {
  const div = document.createElement("div");
  div.classList.add("item-card");

  const username = document.createElement("span");
  const lastChat = document.createElement("span");
  lastChat.classList.add("last-chat");

  username.innerText = contact.sender.username;
  lastChat.innerText = "Ini Chat Terakhir";

  div.appendChild(username);
  div.appendChild(lastChat);

  div.addEventListener("click", async function (e) {
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + data.accessToken,
      },
    };
    const conversation = await fetchJSON(
      "/api/conversation/message/" + contact.id_chat,
      options
    );
    sendMessageButton.dataset.id = contact.id_chat;
    chatRoomBfr = chatRoom + "";
    chatRoom = contact.id_chat;

    removeSelectedContact();
    removeChat();

    if (!div.classList.contains("selected")) div.classList.add("selected");

    listenChannel();
    chatUser.innerText = contact.sender.username;
    userToCall.innerText = contact.sender.username;
    chatUser.dataset.id = contact.sender.id;

    callUser.dataset.id = contact.sender.id

    if (onlineUsers.hasOwnProperty(contact.sender.id))
      chatStatus.innerText = "Online";
    else chatStatus.innerText = "Offline";

    const message = conversation.chat;
    const msgByTime = {};

    for (const chat of message) {
      const date = new Date(chat.created_at);
      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      const newDate = new Date(`${year}-${month}-${day}`);

      if (!msgByTime[newDate]) msgByTime[newDate] = [];
      msgByTime[newDate].push(chat);
    }

    for (const timeChat in msgByTime) {
      createTimeDiv(timeChat);
      for (const chat of msgByTime[timeChat]) {
        if (chat.sender_id === data.id) createChatByUser(chat);
        else createChatByOtherUser(chat);
      }
    }

    if (message.length === 0) removeChat();

    chatOutput.scrollTop = chatOutput.scrollHeight - chatOutput.offsetHeight;
    // chatOutput.scrollBy(0, chatOutput.clientHeight)
  });

  containerUser.appendChild(div);
}

async function getAllConversation() {
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + data.accessToken,
    },
  };
  const result = await fetchJSON("/api/conversation", options);

  const contact = result.data;

  removeContact();

  for (const user of contact) {
    createContact(user);
    listenCall(user.id_chat)
  }
}

function removeChat() {
  const allChat = document.querySelectorAll(".chat");
  const allTime = document.querySelectorAll(".date-chat");

  for (const chat of allChat) chat.remove();
  for (const time of allTime) time.remove();
}

function removeContact() {
  const allContact = document.querySelectorAll(".item-card");

  for (const contact of allContact) contact.remove();
}

function removeSelectedContact() {
  const allContact = document.querySelectorAll(".item-card");

  for (const contact of allContact)
    if (contact.classList.contains("selected"))
      contact.classList.remove("selected");
}

function initPusher() {
  pusher = new Pusher("914eb719506342bd7d28", {
    cluster: "ap1",
    authEndpoint: BASEURL + "/pusher/auth",
    auth: {
      params: {
        user_id: data.id,
        username: data.username,
      },
    },
  });

  pusher.connection.bind("connected", async () => {
    socket_id = pusher.connection.socket_id;
  });

  channel = pusher.subscribe("presence-chat-room");
  channelCall = pusher.subscribe("presence-call-room");

  channel.bind("pusher:subscription_succeeded", () => {
    onlineUsers = channel.members.members;
  });

  channel.bind("pusher:member_added", (member) => {
    const idNow = chatUser.dataset.id;
    if (!onlineUsers.hasOwnProperty(member.id)) onlineUsers[idNow] = null;
    if (idNow === member.id) chatStatus.innerText = "Online";
  });
  channel.bind("pusher:member_removed", (member) => {
    const idNow = chatUser.dataset.id;
    delete onlineUsers[member];
    if (idNow === member.id) chatStatus.innerText = "Offline";
  });
}

function checkMobile() {
  if (window.innerWidth < mobileWidth) {
    IsMobile = true;
    if (!containerChat.classList.contains("hidden"))
      containerChat.classList.add("hidden");
    if (backButton.style.display !== "flex") backButton.style.display = "flex";
  } else {
    IsMobile = false;
    if (containerChat.classList.contains("hidden"))
      containerChat.classList.remove("hidden");
    if (containerUser.classList.contains("hidden"))
      containerUser.classList.remove("hidden");
    if (backButton.style.display !== "none") backButton.style.display = "none";
  }
}

function createTimeDiv(time) {
  const f = new Intl.RelativeTimeFormat("id-ID", {
    style: "long",
    numeric: "auto",
  });
  const today = new Date();
  // const before = new Date('2023-5-3')
  const before = new Date(time);
  const span = document.createElement("span");
  span.classList.add("date-chat");
  span.dataset.time = before.getTime();
  const minDay = before.getDate() - today.getDate();
  if (minDay > 0 || minDay < -7)
    span.innerText = formatterTimeDivisionDate.format(before);
  else if (minDay <= -3 && minDay >= -7)
    span.innerText = formatterTimeDivisionDay.format(before);
  else if (minDay <= 0 && minDay >= -2)
    span.innerText = f.format(minDay, "days");
  chatOutput.appendChild(span);
}

async function loginApp(e) {
  e.preventDefault();
  loading.classList.remove("hidden");
  containerLogin.classList.add("hidden");

  const username = document.querySelector('input[name="username"]').value;
  const password = document.querySelector('input[name="password"]').value;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  };
  const result = await fetchJSON("/api/login", options);
  if (!result) return;
  data = result.data;
  data.accessToken = result.accessToken;
  setFromLocalStorage("user-data", data);
  document.querySelector('input[name="password"]').value = "";

  login.innerText = result.data.username;
  initPusher();
  getAllConversation();
  container.classList.remove("hidden");
  loading.classList.add("hidden");
}

// Call Action
callUser.addEventListener('click', async function() {
  callStatus.innerText = 'Memanggil'
  callModal.style.display = 'flex'
  // showMessage(data)

  if (!answerContainer.classList.contains('hidden')) answerContainer.classList.add('hidden')
  if (closeCallModal.classList.contains('hidden')) closeCallModal.classList.remove('hidden')

  const id = data.id;
  const message = 'calling';
  const conversationId = sendMessageButton.dataset.id;
  if (!conversationId) return
  await fetchJSON("/api/call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-socket-id": socket_id,
      Authorization: "Bearer " + data.accessToken,
    },
    body: JSON.stringify({ conversationId, id, message }),
  });

  await connectRoom(conversationId)

})

closeCallModal.addEventListener('click', async function() {
  callModal.style.display = 'none'

  await fetchJSON("/api/stopCall", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-socket-id": socket_id,
      Authorization: "Bearer " + data.accessToken,
    },
    body: JSON.stringify({ conversationId : chatRoom, }),
  });

  await room.disconnect()
})

// Livekit

async function connectRoom(roomId) {
  const payload = {
      roomName : roomId,
      name : data.username
  }
  const {token} = await fetchJSON('/api/getToken', {
      method : 'POST',
      headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + data.accessToken,
      },
      body : JSON.stringify(payload)
  })
  await room.connect(livekitUrl, token)
  await room.localParticipant.setMicrophoneEnabled(true)
  await room.localParticipant.setCameraEnabled(false)

  showMessage('Connecting . . .')
}

closeCallModal.addEventListener('click', async function() {
    await room.disconnect()
})

function handleTrackPublished(publication, participant) {
    // showMessage({participant, publication})
    // participant.setSubscribed(true)
    publication.setSubscribed(true)
    // if (x) connectRoom()
    // x = false
    // status.innerText = 'Tersambung'
}

function handleTrackSubscribed(RemoteTrack, RemoteTrackPublication, RemoteParticipant) {
        const elementRemote = RemoteTrack.attach()
        callContainer.innerHTML = ''
        callContainer.append(elementRemote)
        callStatus.innerText = 'Terhubung'
        startCountdown()
        // status.innerText = 'Tersambung'
}

async function handleTrackUnsubscribed(
    RemoteTrack,
    RemoteTrackPublication,
    RemoteParticipant,
) {
// remove tracks from all attached elements
    RemoteTrack.detach();
    showMessage('disconnecting . . .')
    // status.innerText = 'Terputus'
    if (callModal.style.display === 'flex') callModal.style.display = 'hidden'
    callStatus.innerText = 'Terputus'
    clearTimeout(callTimer)
    await room.disconnect()
  }
  
  function handleLocalTrackUnpublished(LocalTrackPublication, LocalParticipant) {
    // when local tracks are ended, update UI to remove them from rendering
    // LocalTrackPublication.detach();
  }
  
  function handleActiveSpeakerChange(Participant) {
    // show UI indicators when participant is speaking
  }
  
  async function handleDisconnect() {
    showMessage('disconnected from room');
    showMessage('Panggilan telah selesai');
    if (callModal.style.display === 'flex') callModal.style.display = 'none'
    clearTimeout(callTimer)
    await room.localParticipant.setMicrophoneEnabled(false)
    await room.localParticipant.setCameraEnabled(false)
}

function startCountdown() {
    let time = 0
    callTimer = setInterval(function () {
        callStatus.innerText = formatTime(time)
        time++
    }, 1000); // Interval dalam milidetik (1000ms = 1 detik)
}

// Listener

window.onfocus = () => {
  focus = true;
};

window.onblur = () => {
  focus = false;
};
