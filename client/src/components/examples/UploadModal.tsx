import { useState } from 'react';
import UploadModal from '../UploadModal';
import { Button } from '@/components/ui/button';

export default function UploadModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return <Button onClick={() => setIsOpen(true)}>Open Upload Modal</Button>;
  }

  return (
    <UploadModal
      onClose={() => setIsOpen(false)}
      onUpload={(data) => {
        console.log('Uploaded:', data);
        setIsOpen(false);
      }}
    />
  );
}
