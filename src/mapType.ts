
export const MapTypes = {
	'Hex-Horizontal': 'Hex-Horizontal',
	'Hex-Vertical': 'Hex-Vertical',
	'Square': 'Square',
	'Octo-Square': 'Octo-Square',
	'Triangle': 'Triangle',
} as const;

export type MapType = (typeof MapTypes)[keyof typeof MapTypes];
