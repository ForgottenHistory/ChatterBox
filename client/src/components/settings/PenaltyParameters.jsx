import FormField from '../ui/FormField'

function PenaltyParameters({ settings, onChange }) {
  return (
    <div className="border-t border-[#40444B] pt-4">
      <h3 className="text-[#FFFFFF] font-medium mb-3">Penalty Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormField
            label="Frequency Penalty"
            name="frequency_penalty"
            type="number"
            step="0.01"
            min="-2"
            max="2"
            value={settings.frequency_penalty}
            onChange={onChange}
            placeholder="0.0"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Penalizes based on frequency. Positive = new tokens, negative = repetition
          </p>
        </div>

        <div>
          <FormField
            label="Presence Penalty"
            name="presence_penalty"
            type="number"
            step="0.01"
            min="-2"
            max="2"
            value={settings.presence_penalty}
            onChange={onChange}
            placeholder="0.0"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Penalizes based on presence. Positive = new tokens, negative = repetition
          </p>
        </div>

        <div className="md:col-span-2">
          <FormField
            label="Repetition Penalty"
            name="repetition_penalty"
            type="number"
            step="0.01"
            min="0.1"
            max="2"
            value={settings.repetition_penalty}
            onChange={onChange}
            placeholder="1.0"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Penalizes repetition. Values &gt; 1 = new tokens, &lt; 1 = repetition
          </p>
        </div>
      </div>
    </div>
  )
}

export default PenaltyParameters