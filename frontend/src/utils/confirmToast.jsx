import { toast } from 'react-toastify';

/**
 * Show a confirmation toast with OK/Cancel buttons
 * @param {string} message - Short confirmation message
 * @param {function} onConfirm - Callback when user clicks OK
 */
export const confirmAction = (message, onConfirm) => {
  const toastId = toast.info(
    <div className="text-center">
      <p className="mb-4">{message}</p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => {
            toast.dismiss(toastId);
            onConfirm();
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          OK
        </button>
        <button
          onClick={() => toast.dismiss(toastId)}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>,
    {
      autoClose: false,
      closeButton: false,
      draggable: false,
      closeOnClick: false,
    }
  );
};
