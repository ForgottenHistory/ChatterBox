import React from 'react';
import Modal from './ui/Modal';
import ModelSelector from './ModelSelector';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
  onModelSelect: (modelId: string) => void;
}

const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onModelSelect
}) => {
  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select AI Model"
      subtitle="Choose from hundreds of available models"
      size="large"
      showCloseButton={true}
    >
      <ModelSelector
        currentModel={currentModel}
        onModelSelect={handleModelSelect}
        onClose={onClose}
      />
    </Modal>
  );
};

export default ModelSelectorModal;