import { io } from 'socket.io-client'

let socket = null

const initializeSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000')

    // Handle authentication errors
    socket.on('error', (error) => {
      if (error.code === 'USER_NOT_FOUND') {
        console.log('❌ User not found in database, forcing logout')
        // Clear localStorage and force re-registration
        localStorage.removeItem('chatterbox_user')
        window.location.reload()
      } else {
        console.error('Socket error:', error)
      }
    })
  }
  return socket
}

export const getSocket = () => {
  return initializeSocket()
}

export const sendMessage = (message) => {
  const socketInstance = getSocket()
  socketInstance.emit('send_message', message)
}

export const onNewMessage = (callback) => {
  const socketInstance = getSocket()
  socketInstance.on('new_message', callback)
  return () => socketInstance.off('new_message', callback)
}

export const onLoadMessages = (callback) => {
  const socketInstance = getSocket()
  socketInstance.on('load_messages', callback)
  return () => socketInstance.off('load_messages', callback)
}

export const requestMessageLoad = () => {
  const socketInstance = getSocket()
  socketInstance.emit('request_messages')
}

export default getSocket