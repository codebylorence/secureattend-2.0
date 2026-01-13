import React from 'react';
import { FaUser, FaCog, FaCheck } from 'react-icons/fa';

export default function ThemeTest() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-heading text-2xl font-bold">Theme Test Component</h2>
      
      {/* Buttons */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Buttons</h3>
        <div className="flex gap-4">
          <button className="btn-primary px-4 py-2 rounded-md">Primary Button</button>
          <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover">Hover Button</button>
          <button className="btn-primary px-4 py-2 rounded-md" disabled>Disabled Button</button>
        </div>
      </div>

      {/* Text Colors */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Text Colors</h3>
        <div className="space-y-2">
          <p className="text-heading">Heading Text (should use primary color)</p>
          <p className="text-primary">Primary Text</p>
          <a href="#" className="link-primary">Primary Link</a>
        </div>
      </div>

      {/* Icons */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Icons</h3>
        <div className="flex gap-4">
          <FaUser className="icon-primary" size={24} />
          <FaCog className="text-primary" size={24} />
          <FaCheck className="text-primary" size={24} />
        </div>
      </div>

      {/* Backgrounds */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Backgrounds</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary text-white p-4 rounded-md text-center">Primary BG</div>
          <div className="bg-primary-100 text-primary p-4 rounded-md text-center">Primary 100</div>
          <div className="bg-primary-200 text-primary p-4 rounded-md text-center">Primary 200</div>
        </div>
      </div>

      {/* Gradient */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Gradient</h3>
        <div className="bg-gradient-primary text-white p-6 rounded-lg text-center">
          <h4 className="text-xl font-bold">Gradient Background</h4>
          <p>This should use the primary to secondary gradient</p>
        </div>
      </div>

      {/* Form Elements */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Form Elements</h3>
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Input with primary focus" 
            className="input-primary w-full p-3 rounded-md"
          />
          <input 
            type="text" 
            placeholder="Another input" 
            className="w-full p-3 border border-gray-300 rounded-md focus-primary"
          />
        </div>
      </div>

      {/* Loading Spinner */}
      <div className="space-y-4">
        <h3 className="text-primary text-lg font-semibold">Loading Spinner</h3>
        <div className="animate-spin rounded-full h-12 w-12 spinner-primary"></div>
      </div>
    </div>
  );
}