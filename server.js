const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const MAX_PEOPLE = 8;
const randomQueue = [];

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.status(200).send("ok"));

function removeFromRandomQueue(socket) {
  const index = randomQueue.indexOf(socket);
  if (index !== -1) randomQueue.splice(index, 1);
}
function leaveCurrentRoom(socket) {
  const room = socket.data.room;
  if (room) {
    socket.to(room).emit("peer-left", socket.id);
    socket.leave(room);
    delete socket.data.room;
  }
}
function matchRandom(socket) {
  removeFromRandomQueue(socket);
  leaveCurrentRoom(socket);
  while (randomQueue.length) {
    const other = randomQueue.shift();
    if (other.connected && other.id !== socket.id && !other.data.room) {
      const room = "RANDOM-" + crypto.randomBytes(5).toString("hex").toUpperCase();
      socket.join(room);
      other.join(room);
      socket.data.room = room;
      other.data.room = room;
      socket.data.randomChat = true;
      other.data.randomChat = true;
      socket.emit("random-matched", { room, peer: other.id, offerer: true });
      other.emit("random-matched", { room, peer: socket.id, offerer: false });
      return;
    }
  }
  socket.data.randomChat = true;
  randomQueue.push(socket);
  socket.emit("random-waiting");
}

io.on("connection", (socket) => {
  socket.on("join-room", (rawRoom, callback) => {
    removeFromRandomQueue(socket);
    const room = String(rawRoom || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
    if (!room) {
      if (typeof callback === "function") callback({ ok: false, error: "Vul een kamercode in." });
      return;
    }
    const members = io.sockets.adapter.rooms.get(room);
    if (members && members.size >= MAX_PEOPLE) {
      if (typeof callback === "function") callback({ ok: false, error: "Deze kamer zit vol (maximaal 8 personen)." });
      return;
    }
    leaveCurrentRoom(socket);
    const peers = Array.from(members || []).filter((id) => id !== socket.id);
    socket.join(room);
    socket.data.room = room;
    socket.data.randomChat = false;
    if (typeof callback === "function") callback({ ok: true, room, peers, maxPeople: MAX_PEOPLE });
    socket.to(room).emit("peer-joined", { id: socket.id });
  });

  socket.on("random-next", () => matchRandom(socket));
  socket.on("cancel-random", () => {
    removeFromRandomQueue(socket);
    socket.data.randomChat = false;
    socket.emit("random-cancelled");
  });

  socket.on("signal", ({ to, data } = {}) => {
    if (!to || !data || !socket.data.room) return;
    const target = io.sockets.sockets.get(to);
    if (!target || target.data.room !== socket.data.room) return;
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("leave-room", () => {
    removeFromRandomQueue(socket);
    leaveCurrentRoom(socket);
    socket.data.randomChat = false;
  });

  socket.on("disconnect", () => {
    removeFromRandomQueue(socket);
    leaveCurrentRoom(socket);
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Turk Megle listening on ${PORT}`));
