import React from 'react';
import { motion } from 'motion/react';
import { Activity, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface IndicatorCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({ title, value, subtext, trend, color }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col gap-2"
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{title}</span>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
        {trend === 'neutral' && <Activity className="w-4 h-4 text-blue-500" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold font-mono", color)}>{value}</span>
      </div>
      {subtext && <span className="text-[10px] text-gray-600 font-medium">{subtext}</span>}
    </motion.div>
  );
};
