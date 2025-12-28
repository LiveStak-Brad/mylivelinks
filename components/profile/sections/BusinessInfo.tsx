/**
 * Business Info Section (Business Profile Type)
 * 
 * Displays business information: tagline, services, hours, location, contact.
 * Shows empty state with owner CTA if no info available.
 */

'use client';

import { Briefcase, Clock, MapPin, Mail, Phone } from 'lucide-react';
import { getMockBusinessInfo, getEmptyStateText, BusinessInfo as BusinessInfoType } from '@/lib/mockDataProviders';
import { ProfileType } from '@/lib/profileTypeConfig';

interface BusinessInfoProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  businessInfo?: BusinessInfoType; // Real data when available
  onEditInfo?: () => void;
}

export default function BusinessInfo({ 
  profileType, 
  isOwner = false,
  businessInfo,
  onEditInfo,
}: BusinessInfoProps) {
  // Use real data if provided, otherwise fall back to mock data
  const info = businessInfo || getMockBusinessInfo(profileType);
  const emptyState = getEmptyStateText('business_info', profileType);

  // Empty state
  if (!info) {
    return (
      <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            💼 Business Info
          </h2>
        </div>
        
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {emptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {emptyState.text}
          </p>
          {isOwner && (
            <button
              onClick={onEditInfo}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {emptyState.ownerCTA}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500" />
          💼 Business Info
        </h2>
        {isOwner && (
          <button
            onClick={onEditInfo}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        {info.tagline && (
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white italic">
              &ldquo;{info.tagline}&rdquo;
            </p>
          </div>
        )}

        {info.services && info.services.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Services
            </h3>
            <ul className="space-y-1">
              {info.services.map((service, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {service}
                </li>
              ))}
            </ul>
          </div>
        )}

        {info.hours && (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Hours</h3>
              <p className="text-gray-600 dark:text-gray-400">{info.hours}</p>
            </div>
          </div>
        )}

        {info.location && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Location</h3>
              <p className="text-gray-600 dark:text-gray-400">{info.location}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {info.contactEmail && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <a 
                href={`mailto:${info.contactEmail}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {info.contactEmail}
              </a>
            </div>
          )}
          {info.contactPhone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <a 
                href={`tel:${info.contactPhone}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {info.contactPhone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

