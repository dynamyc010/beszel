import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart'
import { memo, useMemo } from 'react'
import {
	useYAxisWidth,
	chartTimeData,
	cn,
	formatShortDate,
	decimalString,
	chartMargin,
	toFixedFloat,
	getSizeAndUnit,
	toFixedWithoutTrailingZeros,
} from '@/lib/utils'
// import Spinner from '../spinner'
import { useStore } from '@nanostores/react'
import { $containerFilter } from '@/lib/stores'
import { ChartData } from '@/types'
import { Separator } from '../ui/separator'

export default memo(function ContainerChart({
	dataKey,
	chartData,
	chartName,
	unit = '%',
}: {
	dataKey: string
	chartData: ChartData
	chartName: string
	unit?: string
}) {
	const filter = useStore($containerFilter)
	const { yAxisWidth, updateYAxisWidth } = useYAxisWidth()

	const { containerData, ticks, domain, chartTime } = chartData

	const isNetChart = chartName === 'net'

	const chartConfig = useMemo(() => {
		let config = {} as Record<
			string,
			{
				label: string
				color: string
			}
		>
		const totalUsage = {} as Record<string, number>
		for (let stats of containerData) {
			for (let key in stats) {
				if (!key || key === 'created') {
					continue
				}
				if (!(key in totalUsage)) {
					totalUsage[key] = 0
				}
				if (isNetChart) {
					totalUsage[key] += stats[key]?.ns ?? 0 + stats[key]?.nr ?? 0
				} else {
					// @ts-ignore
					totalUsage[key] += stats[key]?.[dataKey] ?? 0
				}
			}
		}
		let keys = Object.keys(totalUsage)
		keys.sort((a, b) => (totalUsage[a] > totalUsage[b] ? -1 : 1))
		const length = keys.length
		for (let i = 0; i < length; i++) {
			const key = keys[i]
			const hue = ((i * 360) / length) % 360
			config[key] = {
				label: key,
				color: `hsl(${hue}, 60%, 55%)`,
			}
		}
		return config satisfies ChartConfig
	}, [chartData])

	// console.log('rendered at', new Date())

	return (
		<div>
			<ChartContainer
				className={cn('h-full w-full absolute aspect-auto bg-card opacity-0 transition-opacity', {
					'opacity-100': yAxisWidth,
				})}
			>
				<AreaChart
					accessibilityLayer
					// syncId={'cpu'}
					data={containerData}
					margin={chartMargin}
					reverseStackOrder={true}
				>
					<CartesianGrid vertical={false} />
					<YAxis
						className="tracking-tighter"
						width={yAxisWidth}
						tickFormatter={(value) => {
							if (chartName === 'cpu') {
								const val = toFixedWithoutTrailingZeros(value, 2) + unit
								return updateYAxisWidth(val)
							}
							const { v, u } = getSizeAndUnit(value, false)
							return updateYAxisWidth(`${toFixedFloat(v, 2)}${u}${isNetChart ? '/s' : ''}`)
						}}
						tickLine={false}
						axisLine={false}
					/>
					<XAxis
						dataKey="created"
						domain={domain}
						allowDataOverflow
						ticks={ticks}
						type="number"
						scale="time"
						minTickGap={35}
						tickMargin={8}
						axisLine={false}
						tickFormatter={chartTimeData[chartTime].format}
					/>
					<ChartTooltip
						animationEasing="ease-out"
						animationDuration={150}
						labelFormatter={(_, data) => formatShortDate(data[0].payload.created)}
						// @ts-ignore
						itemSorter={(a, b) => b.value - a.value}
						content={
							<ChartTooltipContent
								filter={filter}
								contentFormatter={(item, key) => {
									if (!isNetChart) {
										return decimalString(item.value) + unit
									}
									try {
										const sent = item?.payload?.[key]?.ns ?? 0
										const received = item?.payload?.[key]?.nr ?? 0
										return (
											<span className="flex">
												{decimalString(received)} MB/s
												<span className="opacity-70 ml-0.5"> rx </span>
												<Separator orientation="vertical" className="h-3 mx-1.5 bg-primary/40" />
												{decimalString(sent)} MB/s
												<span className="opacity-70 ml-0.5"> tx</span>
											</span>
										)
									} catch (e) {
										return null
									}
								}}
							/>
						}
					/>
					{Object.keys(chartConfig).map((key) => {
						const filtered = filter && !key.includes(filter)
						let fillOpacity = filtered ? 0.05 : 0.4
						let strokeOpacity = filtered ? 0.1 : 1
						return (
							<Area
								key={key}
								isAnimationActive={false}
								dataKey={(data) => {
									if (isNetChart) {
										return data[key]?.ns ?? 0 + data?.[key]?.nr ?? 0
									}
									return data[key]?.[dataKey] ?? 0
								}}
								name={key}
								type="monotoneX"
								fill={chartConfig[key].color}
								fillOpacity={fillOpacity}
								stroke={chartConfig[key].color}
								strokeOpacity={strokeOpacity}
								activeDot={{ opacity: filtered ? 0 : 1 }}
								stackId="a"
							/>
						)
					})}
				</AreaChart>
			</ChartContainer>
		</div>
	)
})