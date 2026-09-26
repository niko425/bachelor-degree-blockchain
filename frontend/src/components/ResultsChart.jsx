import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { formatShare } from '../lib/format'
import { localeFor } from '../lib/i18n'

const SLICE_COLORS = [
  '#8C1F2B',
  '#3A5F4D',
  '#151B2E',
  '#6B6255',
  '#C2644F',
  '#6E9179',
  '#4A5578',
  '#A9A093',
]

const BALLOT = '#EAE6D9'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ResultsChart({ candidates }) {
  const { t, i18n } = useTranslation()
  const locale = localeFor(i18n.language)

  if (!candidates || candidates.length === 0) {
    return null
  }

  const slices = candidates.map((candidate, i) => ({
    name: candidate.name,
    value: Number(candidate.voteCount),
    color: SLICE_COLORS[i % SLICE_COLORS.length],
  }))

  const votesCast = slices.reduce((total, slice) => total + slice.value, 0)

  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">{t('results.heading')}</h2>

      {votesCast === 0 && <p>{t('results.noVotes')}</p>}

      {votesCast > 0 && (
        <>
          <div className="results-chart">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={1}
                  stroke={BALLOT}
                  strokeWidth={2}
                  isAnimationActive={!prefersReducedMotion()}
                  animationDuration={300}
                >
                  {slices.map((slice, i) => (
                    <Cell key={i} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="results-legend">
            {slices.map((slice, i) => (
              <li key={i}>
                <span className="results-swatch" style={{ background: slice.color }} aria-hidden="true" />
                <span>{slice.name}</span>
                <span className="results-figure">{t('candidates.votes', { count: slice.value })}</span>
                <span className="results-figure">{formatShare(slice.value, votesCast, locale)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default ResultsChart
