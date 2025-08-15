import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

export const sendMessage = (message) => {
  socket.emit('send_message', message)
}

export const onNewMessage = (callback) => {
  socket.on('new_message', callback)
  return () => socket.off('new_message', callback)
}

export default socket