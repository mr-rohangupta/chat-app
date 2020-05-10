const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

let count = 0;

//server (emit) -> client (receive) - countUpdated
//client (emit) -> server (receive) - increment

//socket here will contains all the information about the new connection
io.on("connection", (socket) => {
  console.log("New Websocket connection");
  //socket.emit will send the event from server
  //socket.emit("countUpdated", count);

  //Code to join a particular room
  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({
      id: socket.id,
      username,
      room,
    });
    if (error) {
      return callback(error);
    }
    socket.join(user.room);
    socket.emit("message", generateMessage("admin", "Welcome"));
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage("admin", `${user.username} has joined`));
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
    //socket.emit, io.emit, socket.broadcast.emit
    //io.to.emit, socket.broadcast.to.emit
  });

  socket.on("sendMessage", (message, callback) => {
    //filter your message that it should not contains any bad words
    const user = getUser(socket.id);

    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }
    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });

  socket.on("sendLocation", (location, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${location.latitude},${location.longitude}`
      )
    );
    callback();
  });
});

//Here server is up in port 3000
server.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
