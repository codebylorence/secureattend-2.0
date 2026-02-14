import RegistrationRequests from "../components/RegistrationRequests";

export default function RegistrationManagement() {
  return (
    <div className="w-full font-sans pt-15 sm:pt-10">
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Registration Management</h1>
      </div>
      
      <RegistrationRequests />
    </div>
  );
}