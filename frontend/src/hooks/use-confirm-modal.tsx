import { useCallback, useState, JSX } from 'react';

import { ConfirmModal } from '@/components/confirm-modal';

type TUseConfirmParams = {
  title: string;
  text: string;
  confirmButtonText: string;
  cancelButtonText: string;
};

export const useConfirmModal = () => {
  const [modal, setModal] = useState<JSX.Element | null>(null);

  const confirm = useCallback(
    ({ title, text, confirmButtonText, cancelButtonText }: TUseConfirmParams): Promise<boolean> => {
      return new Promise((resolve) => {
        const handleConfirm = () => {
          setModal(null);
          resolve(true);
        };
        const handleCancel = () => {
          setModal(null);
          resolve(false);
        };

        setModal(
          <ConfirmModal
            title={title}
            text={text}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmButtonText={confirmButtonText}
            cancelButtonText={cancelButtonText}
          />
        );
      });
    },
    []
  );

  return { confirm, modal };
};
