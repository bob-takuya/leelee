import StepGuide from './StepGuide';
import PresetMenu from './PresetMenu';
import NodeListPanel from './NodeListPanel';
import StrutSelectionPanel from './StrutSelectionPanel';
import GAParamsPanel from './GAParamsPanel';
import ConvergenceChart from './ConvergenceChart';
import ResultPanel from './ResultPanel';

export default function SidePanel() {
  return (
    <aside className="w-[360px] shrink-0 border-l border-line bg-panel overflow-y-auto">
      <StepGuide />
      <PresetMenu />
      <NodeListPanel />
      <StrutSelectionPanel />
      <GAParamsPanel />
      <ConvergenceChart />
      <ResultPanel />
    </aside>
  );
}
