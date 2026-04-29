
import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = () => {
  // As per guidelines, API key management UI is prohibited.
  // The API key is provided via process.env.API_KEY.
  return null;
};

export default SettingsModal;
