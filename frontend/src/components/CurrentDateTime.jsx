import React, { useState, useEffect } from "react";
import { formatDateTimePH } from "../utils/formatDateTime";

export default function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(formatDateTimePH());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(formatDateTimePH());
    }, 1000); // updates every second
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-gray-600 font-normal">
      {dateTime}
    </p>
  );
}
