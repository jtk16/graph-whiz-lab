export enum KeyboardCategory {
  Operators = 'Operators',
  Trigonometric = 'Trigonometric',
  Mathematical = 'Mathematical',
  Lists = 'Lists',
  Complex = 'Complex',
  Points = 'Points',
  Conditional = 'Conditional',
  Signal = 'Signal Processing',
  Calculus = 'Calculus',
  Constants = 'Constants',
  Variables = 'Variables',
  DataTypes = 'Data Types'
}

export interface KeyboardCategoryInfo {
  id: KeyboardCategory;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORY_INFO: KeyboardCategoryInfo[] = [
  {
    id: KeyboardCategory.Operators,
    name: 'Operators',
    icon: 'Plus',
    description: 'Basic arithmetic and comparison operators'
  },
  {
    id: KeyboardCategory.Trigonometric,
    name: 'Trig',
    icon: 'Activity',
    description: 'Trigonometric functions'
  },
  {
    id: KeyboardCategory.Mathematical,
    name: 'Math',
    icon: 'Calculator',
    description: 'Mathematical functions'
  },
  {
    id: KeyboardCategory.Lists,
    name: 'Lists',
    icon: 'List',
    description: 'List operations and aggregate functions'
  },
  {
    id: KeyboardCategory.Complex,
    name: 'Complex',
    icon: 'CircleDot',
    description: 'Complex number functions'
  },
  {
    id: KeyboardCategory.Points,
    name: 'Points',
    icon: 'MapPin',
    description: 'Point and vector operations'
  },
  {
    id: KeyboardCategory.Conditional,
    name: 'Conditional',
    icon: 'GitBranch',
    description: 'Conditional logic and piecewise functions'
  },
  {
    id: KeyboardCategory.Signal,
    name: 'Signal',
    icon: 'Radio',
    description: 'Signal processing functions'
  },
  {
    id: KeyboardCategory.Calculus,
    name: 'Calculus',
    icon: 'TrendingUp',
    description: 'Derivatives and integration'
  },
  {
    id: KeyboardCategory.Constants,
    name: 'Constants',
    icon: 'Pi',
    description: 'Mathematical constants'
  },
  {
    id: KeyboardCategory.Variables,
    name: 'Variables',
    icon: 'Variable',
    description: 'Common variable names'
  },
  {
    id: KeyboardCategory.DataTypes,
    name: 'Types',
    icon: 'Brackets',
    description: 'Data type constructors'
  }
];
