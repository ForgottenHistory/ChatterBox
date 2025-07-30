import React, { useRef } from 'react';
import { Bot } from '../../types';
import { CharacterCardV2 } from '../../types/character';
import { characterImageParser } from '../../utils/characterImageParser';

import UserAvatar from '../UserAvatar';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import LoadingState from '../ui/LoadingState';

interface BotListTabProps {
  bots: Bot[];
  loading: boolean;
  error: string | null;
  onDeleteBot: (botId: string) => void;
  onImportCharacter: (characterData: CharacterCardV2) => void;
  onCreateNew: () => void;
  deletingBotId: string | null;
}

const BotListTab: React.FC<BotListTabProps> = ({
  bots,
  loading,
  error,
  onDeleteBot,
  onImportCharacter,
  onCreateNew,
  deletingBotId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      let characterData: CharacterCardV2 | null = null;
      
      if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
        characterData = await characterImageParser.extractFromPNG(file) ||
                       await characterImageParser.extractFromPNGAlternative(file);
      } else if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(await file.text());
        if (parsed.spec === 'chara_card_v2') characterData = parsed;
      }

      if (characterData) {
        onImportCharacter(characterData);
      } else {
        setImportError('No character data found in file. Make sure it\'s a valid V2 character card.');
      }
    } catch (error) {
      setImportError(`Failed to import character: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bot-list-content">
      {importError && (
        <ErrorBanner error={importError} onDismiss={() => setImportError(null)} />
      )}
      
      <div className="import-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.json,image/png,application/json"
          onChange={handleImport}
          style={{ display: 'none' }}
          disabled={importing}
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Import V2 Character Card'}
        </Button>
        <p className="import-info">Import from .png or .json character card files</p>
      </div>

      {loading ? (
        <LoadingState message="Loading bots..." />
      ) : bots.length === 0 ? (
        <div className="empty-state">
          <p>No bots created yet</p>
          <Button onClick={onCreateNew}>Create Your First Bot</Button>
        </div>
      ) : (
        <div className="bots-grid">
          {bots.map(bot => (
            <div key={bot.id} className="bot-card">
              <div className="bot-card-header">
                <UserAvatar user={bot} size="medium" showStatus={false} />
                <div className="bot-card-info">
                  <h4>{bot.username}</h4>
                  <span className="bot-description">AI Assistant</span>
                </div>
              </div>
              <div className="bot-card-actions">
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onDeleteBot(bot.id)}
                  disabled={deletingBotId === bot.id}
                >
                  {deletingBotId === bot.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BotListTab;