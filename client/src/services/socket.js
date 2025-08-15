import { io } from 'socket.io-client'

const socket = io('http://localhost:5000')

export const sendMessage = (message) => {
  socket.emit('send_message', message)
}

export const onNewMessage = (callback) => {
  socket.on('new_message', callback)
  return () => socket.off('new_message', callback)
}

export const onLoadMessages = (callback) => {
  socket.on('load_messages', callback)
  return () => socket.off('load_messages', callback)
}

export default socket