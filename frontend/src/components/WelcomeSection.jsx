import React from "react";
import CurrentDateTime from "./CurrentDateTime";

export default function WelcomeSection() {

    const username = localStorage.getItem("username") || "Admin";

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-[#1E3A8A]">Welcome, {username}</h2>
      <p className="mt-1 text-gray-600 font-normal">
        <CurrentDateTime/>
      </p>
    </div>
  );
}
