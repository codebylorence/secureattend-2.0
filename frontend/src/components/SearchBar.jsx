import { IoSearchOutline } from "react-icons/io5";

export default function SearchBar() {
  return (
    <div className="flex items-center w-64 border border-gray-300 rounded-md overflow-hidden">
      <input
        type="text"
        placeholder="Search Employee..."
        className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none"
      />
      <button className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 flex items-center justify-center cursor-pointer">
        <IoSearchOutline size="25"/>
      </button>
    </div>
  );
}
