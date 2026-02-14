import { MdWarning, MdClose } from "react-icons/md";

export default function ResetConfirmationModal({ isOpen, onClose, onConfirm, isResetting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      
      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
        
        {/* Header styling with a warning theme */}
        <div className="bg-rose-50 px-6 py-4 flex items-center justify-between border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-full text-rose-600">
              <MdWarning size={20} />
            </div>
            <h3 className="text-lg font-bold text-rose-900 tracking-tight">
              Reset System Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isResetting}
            className="text-rose-400 hover:text-rose-700 hover:bg-rose-100 p-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4 font-medium">
            This action will permanently reset all system configurations to their original default values. 
          </p>
          
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">The following will be reset:</p>
            <ul className="space-y-2 text-sm text-gray-700 font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> System Name
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> Company Name
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> Theme Colors (Primary & Secondary)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> Default Timezone
              </li>
              <li className="flex items-center gap-2 text-rose-600">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div> System Logo (Will be permanently deleted)
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 sm:justify-end">
          <button
            onClick={onClose}
            disabled={isResetting}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-gray-700 text-sm font-bold rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isResetting}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Resetting...
              </>
            ) : (
              "Yes, Reset Everything"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}