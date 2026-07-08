import React from "react";
import { Phone, Globe, Shield, Cpu, Mail, MapPin } from "lucide-react";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Cpu size={18} />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#0F172A]">
                Nabi Tech <span className="text-blue-600">PLC</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Innovating digital infrastructure and management solutions for the modern Ethiopian enterprise landscape.
            </p>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-bold text-sm text-[#0F172A] mb-4 uppercase tracking-wider">Communication</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <Phone size={14} className="text-gray-400" />
                </div>
                <span className="font-medium">0911149746</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <Globe size={14} className="text-gray-400" />
                </div>
                <span className="font-medium underline decoration-gray-200 underline-offset-4">nabitechplc.com</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm text-[#0F172A] mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3 text-sm font-medium text-gray-500">
              <li className="hover:text-blue-600 cursor-pointer transition-colors">Digital Solutions</li>
              <li className="hover:text-blue-600 cursor-pointer transition-colors">Support Center</li>
              <li className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>

          {/* Status/Badge */}
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-gray-800">Verified System</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              This attendance ecosystem is managed and secured by Nabi Tech PLC infrastructure protocols.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-gray-400">
            © {currentYear} Nabi Tech PLC. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Systems Active</span>
             </div>
             <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">v2.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
