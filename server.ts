// servers imports
import { Server } from "socket.io";

// sql imports
import { RowDataPacket } from 'mysql2';
import { db } from "./db";

// date
import moment from "moment";

// colors for bash
import { color } from "./bashColor"

const io = new Server(3000, {});

io.on("connection", (socket) => {

  const socketId = socket.id

  // ---------------------- functions ---------------------- //
  const getCurrentRoom = (socket: any) => {
    const arr: string[] = [];
    socket.rooms.forEach((e: string) => arr.push(e));
    return arr[1];
  }

  const roomSize = (socket: any) => {
    return socket.rooms.size
  }

  const createdAt = () => {
    return moment(new Date(Date.now())).format('YYYY-MM-DD HH:mm:ss');
  }

  // ---------------------- auth ---------------------- //
  socket.emit("connection", "Bienvenue sur");

  // authentification
  socket.on("auth", (username) => {
    db.query('SELECT * FROM users WHERE login=?', username, (error, result) => {
      const selectedData = <RowDataPacket>result
      if (selectedData.length == 0) {
        db.query(`INSERT INTO users (login, socket_id) VALUES ("${username}", "${socketId}")`, username, (error, result) => {
          const createdData = <RowDataPacket>result;
          io.to(socketId).emit("serveurMessage", color.green + "\nBonjour " + color.bright + color.bold + username + color.reset + color.green + ", votre profil a été créé avec succès ✅." + color.reset);
          socket.emit("chat", roomSize(socket), username, createdData.insertId)
        })
      } else {
        db.query(`UPDATE users SET socket_id="${socketId}" WHERE login="${username}"`)
        socket.emit("chat", roomSize(socket), username, selectedData[0].user_id)
      }
    })
  })

  // ---------------------- room ---------------------- //
  // rejoindre room
  socket.on("joinRoom", (request, username, userId) => {

    if (roomSize(socket) > 1) {
      io.to(socketId).emit("serveurMessage", color.red + color.italic + "🚫 Vous ne pouvez rejoindre qu'un salon à la fois, --leave pour quitter le salon actuel\n" + color.reset);
    } else {
      db.query(`SELECT * FROM rooms WHERE idroom='${request}' OR name='${request}'`, (error, result) => {
        const selectedRoom = <RowDataPacket>result;

        // pas de résultat
        if (selectedRoom[0] == undefined) {
          io.to(socketId).emit("serveurMessage", color.italic + color.yellow + "⚠️ Le salon demandé n'existe pas, --create + room pour créer un nouveau salon\n" + color.reset);
        } else {
          socket.join(selectedRoom[0].name);
          io.to(socketId).emit("serveurMessage", color.cyan + color.italic + color.bold + "Vous avez rejoins le salon " + selectedRoom[0].name + ", commencez à discuter:\n" + color.reset);
          io.to(selectedRoom[0].name).except(socketId).emit("roomMessage", "\n" + color.dim + color.magenta + username + " a rejoins le salon 👋\n" + color.reset);
        }
      })
    }
  })

  // quitter room
  socket.on("leaveRoom", (username) => {

    if (roomSize(socket) > 1) {
      io.to(socketId).emit("serveurMessage", color.yellow + color.italic + "Vous avez quitté le salon " + getCurrentRoom(socket) + ", --rooms pour voir la liste des rooms\n" + color.reset);
      io.to(getCurrentRoom(socket)).except(socketId).emit("roomMessage", color.dim + color.red + "\n" + username + " a quitté le salon 🛫\n" + color.reset);
      socket.leave(getCurrentRoom(socket));
    } else {
      io.to(socketId).emit("serveurMessage", color.red + color.italic + '🚫 Vous devez être dans un salon pour pouvoir le quitter, --rooms pour afficher la liste, ctrl+c pour quitter le chat\n' + color.reset);
    }
  })

  // créer room
  socket.on("createRoom", (request, username, userId) => {

    db.query(`SELECT * FROM rooms WHERE name='${request}'`, (error, result) => {
      const data = <RowDataPacket>result
      if (data[0] == undefined) {
        db.query(`INSERT INTO rooms (name, owner_id) VALUES ('${request}', '${userId}')`);
        io.to(getCurrentRoom(socket)).except(socketId).emit("roomMessage", color.dim + color.red + "\n" + username + " a quitté le salon\n" + color.reset);
        io.to(socketId).emit("serveurMessage", color.green + color.bold + color.italic + "Le salon " + request + " a été crée avec succès ✅\n" + color.reset);
        socket.leave(getCurrentRoom(socket));
        socket.join(request);
      } else {
        io.to(socketId).emit("serveurMessage", color.red + color.italic + "🚫 Le salon " + request + " existe déjà\n" + color.reset);
      }
    })
  })

  // get current room
  socket.on("currentRoom", () => {
    if (roomSize(socket) == 1) {
      io.to(socketId).emit("serveurMessage", color.cyan + color.italic + color.bold + "Vous êtes dans l'entre deux mondes" + color.reset);
    } else {
      io.to(socketId).emit("serveurMessage", color.cyan + color.italic + color.bold + `Vous êtes dans le salon ${getCurrentRoom(socket)}` + color.reset);
    }
  })

  // get connected users
  socket.on("getUsers", () => {
    io.allSockets().then((data) => {
      io.to(socketId).emit("serveurMessage", color.yellow + color.bold + `\nUtilisateur connectés:` + color.reset);
      data.forEach((e) => {
        db.query(`SELECT * FROM users WHERE socket_id =?`, e, (error, result) => {
          var res = <RowDataPacket>result
          io.to(socketId).emit("serveurMessage", color.yellow + color.italic + `name: ${res[0].login}` + color.reset);
        })
      })
      io.to(socketId).emit("serveurMessage", "\n");

    })
  })

  // ---------------------- chat ---------------------- //
  // chat
  socket.on("chat", (msg, username, userId) => {

    if (msg && roomSize(socket) > 1) {
      db.query("SELECT * FROM rooms WHERE name=?", getCurrentRoom(socket), (error, result) => {
        const data = <RowDataPacket>result
        db.query(`INSERT INTO messages (content, createdAt, user_id, room_id, room_owner_id) VALUES ("${msg}", "${createdAt()}", "${userId}", "${data[0].idroom}", "${data[0].owner_id}")`)
      })
      socket.to(getCurrentRoom(socket)).emit("roomMessage", color.bgCyan + color.bright + username + ":" + color.reset + color.cyan + color.dim + ` ${moment(new Date(Date.now())).format('HH:mm')} - ` + color.reset + color.cyan + msg + color.reset)
    } else {
      io.to(socketId).emit("serveurMessage", color.yellow + color.italic + "⚠️  Seules les commandes sont possibles ici, --help pour voir la liste\n" + color.reset);
    }
  });

  // private chat
  socket.on("privateChat", (msg, request, username, userId) => {

    db.query('SELECT * FROM users WHERE login=?', request, (error, result) => {
      var data = <RowDataPacket>result
      if (data.length == 0) {
        io.to(socketId).emit("serveurMessage", color.red + color.italic + "🚫 L'utilisateur demandé n'existe pas\n" + color.reset);
      } else {
        if (data[0].socket_id != null && userId != data[0].user_id) {
          io.to(data[0].socket_id).emit("privateMessage", color.bgMagenta + color.bright + "Message privé de " + username + ":" + color.reset + color.magenta + color.dim + ` ${moment(new Date(Date.now())).format('HH:mm')} - ` + color.reset + color.magenta + " " + msg + color.reset);
          db.query(`INSERT INTO private (content, createdAt, dest_login, user_id) VALUES ("${msg}", "${createdAt()}" ,"${data[0].login}", "${userId}")`)
        } else if (data[0].socket_id != null && userId == data[0].user_id) {
          io.to(socketId).emit("serveurMessage", color.bgMagenta + color.bright + "Message à vous même:" + color.reset + color.magenta + " 😘 Vous êtes parfait(e)" + color.reset + "\n");
        } else {
          io.to(socketId).emit("serveurMessage", color.yellow + color.italic + "📴 Malheureusement " + request + " n'est pas connecté(e), réessaie plus tard\n" + color.reset);
        }
      }
    })
  });

  // ---------------------- friends ---------------------- //
  //add friend
  socket.on("addFriend", (request, userId) => {

    db.query('SELECT user_id FROM users WHERE login=?', request, (error, queryResult) => {
      const data = <RowDataPacket>queryResult
      if (data[0] != undefined && data[0].user_id != userId) {
        db.query(`SELECT * FROM marks WHERE user1_id IN (${userId}, ${data[0].user_id}) AND user2_id IN (${userId}, ${data[0].user_id})`, (error, checkResult) => {
          const dataCheck = <RowDataPacket>checkResult
          if (dataCheck[0] == undefined) {
            db.query(`INSERT INTO marks (user1_id, user2_id) VALUES ('${userId}', '${data[0].user_id}')`);
            io.to(socketId).emit("serveurMessage", "✅ " + color.green + color.italic + color.bold + color.bright + request + color.reset + color.green + color.italic + " a bien été ajouté, --friends pour voir la liste\n" + color.reset);
          } else {
            io.to(socketId).emit("serveurMessage", color.yellow + color.italic + "⚠️  Vous êtes déjà ami(e) avec cette personne\n" + color.reset);
          }
        })
      } else if (data[0] != undefined && data[0].user_id == userId) {
        io.to(socketId).emit("serveurMessage", color.red + color.italic + "🚫 FATAL ERROR: NARCISSISTIC DETECTED\n" + color.reset);
      } else {
        io.to(socketId).emit("serveurMessage", color.red + color.italic + "🚫 Aucun utilisateur répondant à ce nom\n" + color.reset);
      }
    })
  })

  //remove friend
  socket.on("removeFriend", (request, userId) => {

    db.query('SELECT user_id FROM users WHERE login=?', request, (error, queryResult) => {
      const data = <RowDataPacket>queryResult
      if (data[0] != undefined) {
        db.query(`SELECT * FROM marks WHERE user1_id IN (${userId}, ${data[0].user_id}) AND user2_id IN (${userId}, ${data[0].user_id})`, (error, checkResult) => {
          const dataCheck = <RowDataPacket>checkResult
          if (dataCheck[0] == undefined) {
            io.to(socketId).emit("serveurMessage", color.yellow + color.italic + "⚠️ Vous n'êtes pas ami(e) avec cette personne\n" + color.reset);
          } else {
            db.query(`DELETE FROM marks WHERE mark_id = (${dataCheck[0].mark_id})`, (error, deleteResult) => {
              io.to(socketId).emit("serveurMessage", "✅ " + color.green + color.italic + color.bold + color.bright + request + color.reset + color.green + color.italic + " a bien été retiré(e) de votre liste d'ami\n" + color.reset);
            })
          }
        })
      } else {
        io.to(socketId).emit("serveurMessage", color.red + color.italic + "🚫 Aucun utilisateur répondant à ce nom\n" + color.reset);
      }
    })
  })

  //  login de users ou l'id user est égal 
  // ---------------------- functions ---------------------- //
  // messages du serveur
  socket.on("serveurMessage", (msg) => {
    io.to(socketId).emit("serveurMessage", msg);
  })

  // list room sockets
  socket.on("leaveChat", () => {

    io.to(socketId).emit("serveurMessage", color.red + color.bright + color.bold + "\nVous avez été déconnecté(e) du chat, relancez l'application ou tapez 'rs' pour vous reconnecter." + color.reset);
    socket.disconnect();
  })

  // on disconnect
  socket.on("disconnecting", () => {
    db.query(`UPDATE users SET socket_id=NULL WHERE socket_id='${socketId}'`)
  });
});
