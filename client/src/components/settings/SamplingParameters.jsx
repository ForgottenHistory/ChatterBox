import FormField from '../ui/FormField'

function SamplingParameters({ settings, onChange }) {
  return (
    <div className="border-t border-[#40444B] pt-4">
      <h3 className="text-[#FFFFFF] font-medium mb-3">Sampling Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormField
            label="Temperature"
            name="temperature"
            type="number"
            step="0.01"
            min="0"
            max="2"
            value={settings.temperature}
            onChange={onChange}
            placeholder="0.7"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Controls randomness. Lower = more deterministic, higher = more random
          </p>
        </div>

        <div>
          <FormField
            label="Top P"
            name="top_p"
            type="number"
            step="0.01"
            min="0.01"
            max="1"
            value={settings.top_p}
            onChange={onChange}
            placeholder="1.0"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Cumulative probability of top tokens. Must be in (0, 1]
          </p>
        </div>

        <div>
          <FormField
            label="Top K"
            name="top_k"
            type="number"
            min="-1"
            value={settings.top_k}
            onChange={onChange}
            placeholder="-1"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Limits top tokens to consider. Set to -1 for all tokens
          </p>
        </div>

        <div>
          <FormField
            label="Min P"
            name="min_p"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={settings.min_p}
            onChange={onChange}
            placeholder="0.0"
          />
          <p className="text-[#72767D] text-xs mt-1">
            Minimum probability relative to most likely token
          </p>
        </div>
      </div>
    </div>
  )
}

export default SamplingParameters