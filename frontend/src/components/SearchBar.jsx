export default function SearchBar({ value = "", onChange, placeholder = "Search Employee..." }) {
  // This safely passes the new text back up to your parent component
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="w-full lg:w-72 relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder} // Now uses the prop you passed in
        value={value} // Gets the text from the parent
        onChange={handleChange} // Sends the new text to the parent
        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
      />
    </div>
  );
}