import React, { useState } from 'react';
import { useCreateCampaign } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: bigint;
}

export default function CreateCampaignModal({ isOpen, onClose, communityId }: CreateCampaignModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [daysUntilDeadline, setDaysUntilDeadline] = useState('30');
  
  const createCampaign = useCreateCampaign();
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !goalAmount || !daysUntilDeadline) {
      alert('Please fill in all fields');
      return;
    }
    
    const goalAmountNum = Number(goalAmount);
    const daysNum = Number(daysUntilDeadline);
    
    if (isNaN(goalAmountNum) || goalAmountNum <= 0) {
      alert('Please enter a valid goal amount');
      return;
    }
    
    if (isNaN(daysNum) || daysNum <= 0) {
      alert('Please enter a valid number of days');
      return;
    }
    
    try {
      const nowNs = BigInt(Date.now() * 1_000_000); // Convert to nanoseconds as bigint
      const durationNs = BigInt(daysNum * 24 * 60 * 60 * 1_000_000_000);
      const deadlineNs = nowNs + durationNs;
      
      await createCampaign.mutateAsync({
        communityId,
        title: title.trim(),
        description: description.trim(),
        goalAmount: BigInt(Math.floor(goalAmountNum)),
        deadlineNs
      });
      
      setTitle('');
      setDescription('');
      setGoalAmount('');
      setDaysUntilDeadline('30');
      onClose();
    } catch (error: any) {
      alert(`Failed to create campaign: ${error.message || 'Unknown error'}`);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-bold text-black amnesty-heading">CREATE FUNDRAISING CAMPAIGN</h3>
          <button
            onClick={onClose}
            className="text-black hover:text-amnesty-gray-700 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-amnesty-yellow border-4 border-black">
          <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">ALL-OR-NOTHING FUNDING</h4>
          <p className="text-base text-black">
            Your campaign will follow an all-or-nothing model. Funds are only collected if the target 
            amount is met by the deadline. If the goal is not reached, no funds will be collected.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lg font-bold text-black mb-2 amnesty-heading">
              CAMPAIGN TITLE *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Enter campaign title"
              required
            />
          </div>
          
          <div>
            <label className="block text-lg font-bold text-black mb-2 amnesty-heading">
              GOAL AMOUNT ($) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="input-field"
              placeholder="Enter target amount"
              required
            />
          </div>
          
          <div>
            <label className="block text-lg font-bold text-black mb-2 amnesty-heading">
              CAMPAIGN DURATION (DAYS) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={daysUntilDeadline}
              onChange={(e) => setDaysUntilDeadline(e.target.value)}
              className="input-field"
              placeholder="Enter number of days"
              required
            />
          </div>
          
          <div>
            <label className="block text-lg font-bold text-black mb-2 amnesty-heading">
              CAMPAIGN STORY *
            </label>
            <p className="text-sm text-black mb-2">
              Include narrative, who benefits, and budget outline
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={8}
              placeholder="Describe your campaign, who it will help, and how the funds will be used..."
              required
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={createCampaign.isPending}
              className="flex-1 bg-black text-white px-8 py-4 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading disabled:opacity-50 text-lg"
            >
              {createCampaign.isPending ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">CREATING...</span>
                </span>
              ) : (
                'CREATE CAMPAIGN'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-amnesty-gray-200 text-black px-8 py-4 font-bold uppercase tracking-wide hover:bg-amnesty-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-400 border-4 border-black amnesty-heading text-lg"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
