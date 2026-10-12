const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
const MAX_PEOPLE = 8;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.status(200).send("ok"));

io.on("connection", (socket) => {
  socket.on("join-room", (rawRoom, callback) => {
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

    if (socket.data.room) {
      socket.leave(socket.data.room);
      socket.to(socket.data.room).emit("peer-left", socket.id);
    }

    const peers = Array.from(members || []).filter((id) => id !== socket.id);
    socket.join(room);
    socket.data.room = room;
    if (typeof callback === "function") callback({ ok: true, room, peers, maxPeople: MAX_PEOPLE });
    socket.to(room).emit("peer-joined", { id: socket.id });
  });

  socket.on("signal", ({ to, data } = {}) => {
    if (!to || !data || !socket.data.room) return;
    const target = io.sockets.sockets.get(to);
    if (!target || target.data.room !== socket.data.room) return;
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("leave-room", () => {
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit("peer-left", socket.id);
    socket.leave(room);
    delete socket.data.room;
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("peer-left", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`VideoMeet listening on ${PORT}`));