import SingleTagInput from './SingleTagInput.jsx';
import { searchRegions } from '../utils/regionDatabase.js';
import { regionFlag, cleanLocation } from '../utils/regionFlags.js';

export default function RegionTagInput({ value, onChange }) {
  const renderTag = (val) => {
    const rf = regionFlag(val);
    const display = rf ? cleanLocation(val) : val;
    return (
      <>
        {rf && <span className={`fi fi-${rf.iso} region-tag-flag`} title={rf.country} />}
        {display}
      </>
    );
  };

  return (
    <SingleTagInput
      field="region"
      value={value}
      onChange={onChange}
      placeholder="Marlborough, Bordeaux…"
      tagColor="#42a5f5"
      tagBg="#1a2a3a55"
      searchFn={searchRegions}
      renderTag={renderTag}
    />
  );
}
