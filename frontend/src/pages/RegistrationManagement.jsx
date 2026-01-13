import RegistrationRequests from "../components/RegistrationRequests";

export default function RegistrationManagement() {
  return (
    <div className="pr-10 bg-gray-50">
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-2 mb-4 pt-3">
        <h1 className="text-heading text-[21px] font-semibold">Registration Management</h1>
        <p className="text-gray-600 text-sm mt-1">Review and approve employee registration requests</p>
      </div>
      
      <RegistrationRequests />
    </div>
  );
}