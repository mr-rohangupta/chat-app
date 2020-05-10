const socket = io();

//Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("textarea");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $chatMessages = document.querySelector("#chatmessages");

//Templates
const adminTemplate = document.querySelector("#admin-template").innerHTML;
const userTemplate = document.querySelector("#user-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;
const roomNameTemplate = document.querySelector("#roomname-template").innerHTML;

//Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  //New message element
  const $newMessage = $chatMessages.lastElementChild;

  //Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  //Visible Height
  const visibleHeight = $chatMessages.offsetHeight;

  //Height of message container
  const containerHeight = $chatMessages.scrollHeight;

  //How far have I scrolled ?
  const scrollOffset = $chatMessages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $chatMessages.scrollTop = $chatMessages.scrollHeight;
  }
};
//server (emit) -> client (receive) -> acknowledgement -> server
//client (emit) -> server (receive) -> acknowledgement -> client

socket.on("message", (message) => {
  console.log(message);
  if (message.username === "admin") {
    const adminHtml = Mustache.render(adminTemplate, {
      username: message.username,
      message: message.text,
      createdAt: moment(message.createdAt).format("h:mm a"),
    });
    $chatMessages.insertAdjacentHTML("beforeend", adminHtml);
    autoscroll();
  } else {
    const userHtml = Mustache.render(userTemplate, {
      username: message.username,
      message: message.text,
      createdAt: moment(message.createdAt).format("h:mm a"),
    });
    $chatMessages.insertAdjacentHTML("beforeend", userHtml);
    autoscroll();
  }
});

socket.on("locationMessage", (message) => {
  const html = Mustache.render(locationMessageTemplate, {
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $chatMessages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  const roomNameHtml = Mustache.render(roomNameTemplate, {
    room,
  });
  document.querySelector("#sidebar").innerHTML = html;
  document.querySelector("#roomname").innerHTML = roomNameHtml;
});

//Added event listener for submitting form
$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  $messageFormButton.setAttribute("disabled", "disabled");
  const message = e.target.elements.message.value;
  socket.emit("sendMessage", message.trim(), (error) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("Message Delivered");
  });
});

$("#usertext").keypress(function (e) {
  if (e.which === 13) {
    $messageFormButton.setAttribute("disabled", "disabled");
    const message = $("#usertext").val();
    socket.emit("sendMessage", message.trim(), (error) => {
      $messageFormButton.removeAttribute("disabled");
      $messageFormInput.value = "";
      $messageFormInput.focus();
      if (error) {
        return console.log(error);
      }
      console.log("Message Delivered");
    });
  }
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  }
  $sendLocationButton.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
        console.log("Location Shared");
      }
    );
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
