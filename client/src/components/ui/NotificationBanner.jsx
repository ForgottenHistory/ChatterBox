import Button from './Button'
import { useNotifications } from '../../contexts/NotificationContext'

function NotificationBanner() {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  const getNotificationStyles = (type) => {
    const baseStyles = 'border-l-4 p-4 mb-2 rounded-r-lg'
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-[#ED4245]/10 border-[#ED4245] text-[#ED4245]`
      case 'warning':
        return `${baseStyles} bg-[#FAA61A]/10 border-[#FAA61A] text-[#FAA61A]`
      case 'success':
        return `${baseStyles} bg-[#57F287]/10 border-[#57F287] text-[#57F287]`
      case 'info':
      default:
        return `${baseStyles} bg-[#5865F2]/10 border-[#5865F2] text-[#5865F2]`
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'success':
        return '✅'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={getNotificationStyles(notification.type)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-lg">{getIcon(notification.type)}</span>
                <div>
                  {notification.title && (
                    <div className="font-medium mb-1">{notification.title}</div>
                  )}
                  <div className="text-sm opacity-90">{notification.message}</div>
                  {notification.action && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={notification.action.onClick}
                        className="text-inherit hover:bg-black/10"
                      >
                        {notification.action.label}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-inherit hover:opacity-70 transition-opacity ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationBanner