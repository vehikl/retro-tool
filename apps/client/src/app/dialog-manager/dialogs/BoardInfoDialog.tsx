import { useState } from 'react';
import { Board } from '@prisma/client';
import { DialogProps } from 'dialog-manager-react';
import { useCopyToClipboard, useLocation } from 'react-use';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/inputs/TextInput';
import { BaseDialog } from './BaseDialog';
import { useTransferBoardOwnership } from '../../hooks/boards';

type BoardInfoDialogProps = {
  board: Board;
} & DialogProps;

export default function BoardInfoDialog(props: BoardInfoDialogProps) {
  const { active, board, closeDialog } = props;
  const [githubNickname, setGithubNickname] = useState('');
  const [githubError, setGithubError] = useState<string>();
  const location = useLocation();
  const [, copy] = useCopyToClipboard();
  const { transferOwnership, transferOwnershipLoading } = useTransferBoardOwnership(board.id);

  const inviteCode = `${location.origin}/invites/${board.inviteCode}`;

  const confirmDialog = () => {
    window.localStorage.setItem(`board-info-shown-${board.id}`, 'true');
    closeDialog();
  };

  const changeOwner = async () => {
    try {
      await transferOwnership({ githubNickname });
      closeDialog();
    } catch (e: any) {
      setGithubError(e.response?.data?.message ?? 'Error');
    }
  };

  const footer = () => {
    return (
      <div>
        <Button variant="white" className="mr-2" onClick={closeDialog}>
          Close
        </Button>

        <Button variant="primary" onClick={() => confirmDialog()}>
          Confirm
        </Button>
      </div>
    );
  };

  return (
    <BaseDialog closeDialog={props.closeDialog} footer={footer}>
      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
        Invite Members
      </h3>
      <div className="flex flex-row mt-2 mb-6">
        <TextInput
          type="text"
          className="pr-2"
          defaultValue={inviteCode}
          readOnly={true}
          name="invite_code"
          label="Invite users to this board by sharing the link below."
        />
        <div className="flex items-end">
          <Button onClick={() => copy(inviteCode)}>Copy</Button>
        </div>
      </div>

      <h3 className="text-lg leading-6 font-medium text-gray-900" id="change-owner-title">
        Change Owner
      </h3>
      <div className="flex flex-row mt-2">
        <TextInput
          type="text"
          className="pr-2"
          label="Enter the GitHub username to change board ownership to."
          value={githubNickname}
          onChange={(e) => setGithubNickname(e.target.value)}
          errors={githubError}
        />
        <div className="flex items-end flex-none">
          <Button onClick={changeOwner} isLoading={transferOwnershipLoading}>
            Change Owner
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
}
