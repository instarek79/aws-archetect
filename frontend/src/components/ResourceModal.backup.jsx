import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

function ResourceModal({ isOpen, onClose, onSave, resource, mode = 'add' }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    type: 'ec2',
    region: 'us-east-1',
    dependencies: [],
    description: ''
  });

  const [dependencyInput, setDependencyInput] = useState('');

  useEffect(() => {
    if (resource && mode === 'edit') {
      setFormData({
        name: resource.name || '',
        type: resource.type || 'ec2',
        region: resource.region || 'us-east-1',
        dependencies: resource.dependencies || [],
        description: resource.description || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'ec2',
        region: 'us-east-1',
        dependencies: [],
        description: ''
      });
    }
  }, [resource, mode, isOpen]);

  const resourceTypes = [
    { value: 'ec2', label: t('ec2') },
    { value: 's3', label: t('s3') },
    { value: 'rds', label: t('rds') },
    { value: 'lambda', label: t('lambda') },
    { value: 'vpc', label: t('vpc') },
    { value: 'elb', label: t('elb') },
    { value: 'cloudfront', label: t('cloudfront') },
    { value: 'route53', label: t('route53') },
    { value: 'dynamodb', label: t('dynamodb') },
    { value: 'sns', label: t('sns') },
    { value: 'sqs', label: t('sqs') },
  ];

  const regions = [
    { value: 'us-east-1', label: t('usEast1') },
    { value: 'us-east-2', label: t('usEast2') },
    { value: 'us-west-1', label: t('usWest1') },
    { value: 'us-west-2', label: t('usWest2') },
    { value: 'eu-west-1', label: t('euWest1') },
    { value: 'eu-central-1', label: t('euCentral1') },
    { value: 'ap-southeast-1', label: t('apSoutheast1') },
    { value: 'ap-northeast-1', label: t('apNortheast1') },
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddDependency = () => {
    if (dependencyInput.trim()) {
      setFormData({
        ...formData,
        dependencies: [...formData.dependencies, dependencyInput.trim()]
      });
      setDependencyInput('');
    }
  };

  const handleRemoveDependency = (index) => {
    setFormData({
      ...formData,
      dependencies: formData.dependencies.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? t('editResource') : t('addResource')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Resource Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('resourceName')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
              placeholder={t('resourceName')}
            />
          </div>

          {/* Resource Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('resourceType')} *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
            >
              {resourceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('region')} *
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
            >
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dependencies')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={dependencyInput}
                onChange={(e) => setDependencyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDependency())}
                className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                placeholder={t('dependencies')}
              />
              <button
                type="button"
                onClick={handleAddDependency}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.dependencies.map((dep, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                >
                  {dep}
                  <button
                    type="button"
                    onClick={() => handleRemoveDependency(index)}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
              placeholder={t('description')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResourceModal;
