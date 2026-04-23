import React, { useState } from 'react';
import { useCreateProposal } from '../hooks/useQueries';
import { ProposalOverrides } from '../backend';
import LoadingSpinner from './LoadingSpinner';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: bigint;
}

export default function CreateProposalModal({ isOpen, onClose, communityId }: CreateProposalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [votingWindowDays, setVotingWindowDays] = useState(3);
  const [quorum, setQuorum] = useState(1);
  const [passThreshold, setPassThreshold] = useState(50);
  const createProposal = useCreateProposal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      try {
        const overrides: ProposalOverrides | null = useCustomSettings ? {
          windowNs: BigInt(votingWindowDays * 24 * 60 * 60 * 1000 * 1000 * 1000), // Convert days to nanoseconds
          quorum: BigInt(quorum),
          passPct: BigInt(passThreshold)
        } : null;

        await createProposal.mutateAsync({ 
          communityId, 
          title: title.trim(), 
          description: description.trim(),
          overrides
        });
        
        // Reset form
        setTitle('');
        setDescription('');
        setUseCustomSettings(false);
        setVotingWindowDays(3);
        setQuorum(1);
        setPassThreshold(50);
        onClose();
      } catch (error) {
        console.error('Failed to create proposal:', error);
      }
    }
  };

  const handleClose = () => {
    if (!createProposal.isPending) {
      setTitle('');
      setDescription('');
      setUseCustomSettings(false);
      setVotingWindowDays(3);
      setQuorum(1);
      setPassThreshold(50);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-amnesty-yellow max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty-yellow">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-black">
            <h2 className="text-3xl font-bold text-black amnesty-heading">CREATE NEW PROPOSAL</h2>
            <button
              onClick={handleClose}
              disabled={createProposal.isPending}
              className="text-black hover:text-amnesty-gray-700 disabled:opacity-50 p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="proposal-title" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                PROPOSAL TITLE *
              </label>
              <input
                type="text"
                id="proposal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field text-lg"
                placeholder="Enter proposal title"
                required
                disabled={createProposal.isPending}
                maxLength={100}
              />
              <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">{title.length}/100 CHARACTERS</p>
            </div>

            <div>
              <label htmlFor="proposal-description" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                PROPOSAL DESCRIPTION *
              </label>
              <textarea
                id="proposal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="input-field text-lg resize-none"
                placeholder="Describe your proposal in detail. What are you proposing? Why should the community support it?"
                required
                disabled={createProposal.isPending}
                maxLength={1000}
              />
              <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">{description.length}/1000 CHARACTERS</p>
            </div>

            {/* Governance Settings Toggle */}
            <div className="border-4 border-black p-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="custom-settings"
                  checked={useCustomSettings}
                  onChange={(e) => setUseCustomSettings(e.target.checked)}
                  className="w-5 h-5 mr-3 border-2 border-black"
                  disabled={createProposal.isPending}
                />
                <label htmlFor="custom-settings" className="text-lg font-bold text-black amnesty-heading">
                  CUSTOMIZE GOVERNANCE SETTINGS
                </label>
              </div>
              
              {!useCustomSettings && (
                <div className="bg-amnesty-gray-100 border-2 border-black p-4">
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">DEFAULT SETTINGS</h4>
                  <ul className="text-black space-y-1">
                    <li>• <strong>Voting Window:</strong> 3 days</li>
                    <li>• <strong>Quorum:</strong> 1 vote minimum</li>
                    <li>• <strong>Pass Threshold:</strong> 50% of votes must be "yes"</li>
                  </ul>
                </div>
              )}

              {useCustomSettings && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label htmlFor="voting-window" className="block text-lg font-bold text-black mb-2 amnesty-heading">
                      VOTING WINDOW (DAYS)
                    </label>
                    <input
                      type="number"
                      id="voting-window"
                      value={votingWindowDays}
                      onChange={(e) => setVotingWindowDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-field text-lg w-32"
                      min="1"
                      max="30"
                      disabled={createProposal.isPending}
                    />
                    <p className="text-sm text-amnesty-gray-600 mt-1">How long members can vote (1-30 days)</p>
                  </div>

                  <div>
                    <label htmlFor="quorum" className="block text-lg font-bold text-black mb-2 amnesty-heading">
                      MINIMUM VOTES (QUORUM)
                    </label>
                    <input
                      type="number"
                      id="quorum"
                      value={quorum}
                      onChange={(e) => setQuorum(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input-field text-lg w-32"
                      min="1"
                      disabled={createProposal.isPending}
                    />
                    <p className="text-sm text-amnesty-gray-600 mt-1">Minimum total votes required for proposal to be valid</p>
                  </div>

                  <div>
                    <label htmlFor="pass-threshold" className="block text-lg font-bold text-black mb-2 amnesty-heading">
                      PASS THRESHOLD (%)
                    </label>
                    <input
                      type="number"
                      id="pass-threshold"
                      value={passThreshold}
                      onChange={(e) => setPassThreshold(Math.max(1, Math.min(100, parseInt(e.target.value) || 50)))}
                      className="input-field text-lg w-32"
                      min="1"
                      max="100"
                      disabled={createProposal.isPending}
                    />
                    <p className="text-sm text-amnesty-gray-600 mt-1">Percentage of "yes" votes needed to pass (1-100%)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amnesty-yellow border-4 border-black p-6">
              <div className="flex">
                <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">PROPOSAL SUBMISSION</h4>
                  <p className="text-lg text-black">
                    Once submitted, community members will be able to vote "yes" or "no" on your proposal during the voting window. 
                    After the voting period ends, any member can finalize the proposal to determine if it passed or failed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={createProposal.isPending}
                className="flex-1 btn-secondary text-lg py-4"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !description.trim() || createProposal.isPending}
                className="flex-1 bg-black text-white py-4 px-6 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center amnesty-heading border-4 border-black"
              >
                {createProposal.isPending ? (
                  <>
                    <LoadingSpinner size="small" className="mr-3" />
                    CREATING...
                  </>
                ) : (
                  'CREATE PROPOSAL'
                )}
              </button>
            </div>
          </form>

          {createProposal.isError && (
            <div className="mt-6 p-4 bg-black text-white border-4 border-amnesty-yellow">
              <p className="text-lg font-bold amnesty-heading">
                FAILED TO CREATE PROPOSAL. PLEASE CHECK YOUR PERMISSIONS AND TRY AGAIN.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
