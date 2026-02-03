import { useState, useEffect } from "react";
import CurrentDateTime from "./CurrentDateTime";

export default function WelcomeSection() {
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const name = user.employee?.firstname && user.employee?.lastname 
      ? `${user.employee.firstname} ${user.employee.lastname}`
      : user.username || "Employee";
    const dept = user.employee?.department || "";
    setEmployeeName(name);
    setDepartment(dept);
  }, []);

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-[#1E3A8A]">Welcome, {employeeName}</h2>
      {department && (
        <p className="text-gray-600 font-medium">Department: {department}</p>
      )}
      <div className="mt-1">
        <CurrentDateTime/>
      </div>
    </div>
  );
}
