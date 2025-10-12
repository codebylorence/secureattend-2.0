import { IoNotifications } from "react-icons/io5";
import Profile from "../assets/img/profile.png";

export default function Navbar() {
  return (
    <div className='bg-[#1E3A8A] py-5 px-5 content-center flex inset-x-0 top-0 fixed'>
      <h1 className='text-2xl text-white font-bold'>SecureAttend</h1>
      <div className="w-full flex justify-end items-center">
        <div className="flex items-center gap-6">
          <IoNotifications size={25} color="white" />
          <div className="flex">
            <img src={Profile} alt="" className="w-10"/>
            <p className="flex text-center text-sm justify-center items-center text-white px-2">Admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
