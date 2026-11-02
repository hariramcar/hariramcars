'use client';
/* eslint-disable react-hooks/incompatible-library */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RotateCw,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import Link from 'next/link';
import api from '@/lib/api';
import { compressImage } from '@/lib/imageCompressor';
import { getOptimizedImage } from '@/lib/utils';

// Feature Manager Component for Key-Value pairs
function FeatureManager({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "features"
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="font-body text-sm font-semibold text-text">
          Key Features (Specifications)
        </label>
        <button
          type="button"
          onClick={() => append({ key: '', value: '' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg font-body text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Feature
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div className="relative">
                <input
                  {...register(`features.${index}.key`)}
                  placeholder="Feature (e.g. Airbags)"
                  className="w-full px-4 py-2.5 bg-background border border-transparent focus:border-primary/30 rounded-xl font-body text-sm text-text placeholder:text-text-muted/40 outline-none transition-all focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="relative">
                <input
                  {...register(`features.${index}.value`)}
                  placeholder="Value (e.g. 6) - Optional"
                  className="w-full px-4 py-2.5 bg-background border border-transparent focus:border-primary/30 rounded-xl font-body text-sm text-text placeholder:text-text-muted/40 outline-none transition-all focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
              title="Remove Feature"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <div
          onClick={() => append({ key: '', value: '' })}
          className="py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-text-muted/50 hover:text-primary hover:border-primary/20 hover:bg-primary/[0.01] cursor-pointer transition-all"
        >
          <Plus className="w-6 h-6 mb-2" />
          <span className="font-body text-xs font-medium">Click to add your first feature</span>
        </div>
      )}
    </div>
  );
}

// Reusable Select component
function FormSelect({ label, options, placeholder, register, error }) {
  return (
    <div className="space-y-2">
      <label className="font-body text-sm font-semibold text-text">
        {label}
      </label>
      <div className="relative">
        <select
          {...register}
          className={`w-full px-4 py-3 bg-background border ${error ? 'border-red-500' : 'border-transparent'} focus:border-primary/30 rounded-xl font-body text-sm text-text outline-none transition-all focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer pr-10`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>
      {error && <span className="text-red-500 text-xs font-body">{error.message}</span>}
    </div>
  );
}

// Reusable Text Input component
function FormInput({ label, type = 'text', placeholder, prefix, register, error }) {
  return (
    <div className="space-y-2">
      <label className="font-body text-sm font-semibold text-text">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-sm font-semibold text-text-muted">
            {prefix}
          </span>
        )}
        <input
          type={type}
          {...register}
          placeholder={placeholder}
          className={`w-full ${prefix ? 'pl-8' : 'pl-4'} pr-4 py-3 bg-background border ${error ? 'border-red-500' : 'border-transparent'} focus:border-primary/30 rounded-xl font-body text-sm text-text placeholder:text-text-muted/50 outline-none transition-all focus:ring-2 focus:ring-primary/10`}
        />
      </div>
      {error && <span className="text-red-500 text-xs font-body">{error.message}</span>}
    </div>
  );
}

// Reusable Textarea component
function FormTextarea({ label, placeholder, register, error, rows = 4 }) {
  return (
    <div className="space-y-2">
      <label className="font-body text-sm font-semibold text-text">
        {label}
      </label>
      <textarea
        {...register}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-background border ${error ? 'border-red-500' : 'border-transparent'} focus:border-primary/30 rounded-xl font-body text-sm text-text placeholder:text-text-muted/50 outline-none transition-all focus:ring-2 focus:ring-primary/10 resize-none`}
      />
      {error && <span className="text-red-500 text-xs font-body">{error.message}</span>}
    </div>
  );
}

// Toggle Switch component
function ToggleSwitch({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-4 bg-background border border-gray-100/10 rounded-xl cursor-pointer group hover:bg-white/5 transition-colors">
      <div className="flex flex-col pr-4">
        <span className="font-body text-sm font-semibold text-text">{label}</span>
        {description && (
          <span className="font-body text-xs text-text-muted mt-0.5">{description}</span>
        )}
      </div>
      <div className="relative inline-flex items-center shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked || false} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
      </div>
    </label>
  );
}

// Single New File Preview Thumbnail with safe blob URL memory management
function FileThumbnail({ file, isMain, index, onMovePhotoLeft, onMovePhotoRight, onRemoveFile }) {
  const url = useMemo(() => {
    if (!file) return '';
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <div className="relative group bg-background rounded-xl overflow-hidden border border-gray-100 aspect-[4/3]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/5 text-xs text-text-muted">Loading...</div>
      )}
      {isMain ? (
        <div className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">MAIN</div>
      ) : (
        <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">NEW</div>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          {onMovePhotoLeft && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onMovePhotoLeft(); }} className="text-[10px] bg-gray-800/80 text-white px-2 py-1.5 rounded font-bold hover:bg-gray-700 shadow-sm">&larr;</button>
          )}
          {onMovePhotoRight && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onMovePhotoRight(); }} className="text-[10px] bg-gray-800/80 text-white px-2 py-1.5 rounded font-bold hover:bg-gray-700 shadow-sm">&rarr;</button>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemoveFile(); }}
          className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded font-bold hover:bg-red-600 shadow-sm uppercase tracking-wide"
        >
          Remove
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="font-body text-[10px] text-white truncate text-center">{file.name}</p>
      </div>
    </div>
  );
}

// Drag & Drop Zone component combining existing and new files
function DropZone({
  title, description, icon: Icon, accept, id,
  existingImages, onRemoveExisting, onMoveExistingLeft, onMoveExistingRight, onMakeExistingMain,
  files, onFilesAdded, onRemoveFile, onMovePhotoLeft, onMovePhotoRight
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded([...e.dataTransfer.files]);
    }
  }, [onFilesAdded]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded([...e.target.files]);
      e.target.value = ''; // Clean up so re-selecting photos triggers onChange
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-text-muted" />
        <h3 className="font-heading font-bold text-base text-text">{title}</h3>
      </div>

      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-8
          flex flex-col items-center justify-center text-center
          transition-all duration-200
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-200 bg-background hover:border-primary/30 hover:bg-primary/[0.02]'
          }
        `}
      >
        <input ref={inputRef} type="file" accept={accept} multiple onChange={handleFileSelect} className="hidden" id={id} />

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-primary/5">
          <Upload className="w-6 h-6 text-primary" />
        </div>

        <p className="font-body text-sm font-semibold text-text mb-1">
          {isDragging ? 'Release to upload' : 'Drag & drop files here'}
        </p>
        <p className="font-body text-xs text-text-muted">{description}</p>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          className="mt-4 px-5 py-2 rounded-xl font-body text-sm font-bold transition-colors bg-primary/5 text-primary hover:bg-primary/10"
        >
          Browse Files
        </button>
      </div>

      {/* File Preview Grid */}
      {(existingImages.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">

          {/* Existing Images */}
          {existingImages.map((img, index) => {
            const isMain = index === 0;
            return (
              <div key={`existing-${index}`} className="relative group bg-background rounded-xl overflow-hidden border border-gray-100 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getOptimizedImage(img.url, 400)} alt="Existing" className="w-full h-full object-cover" />
                {isMain ? (
                  <div className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">MAIN</div>
                ) : (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">EXISTING</div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    {onMoveExistingLeft && index > 0 && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onMoveExistingLeft(index); }} className="text-[10px] bg-gray-800/80 text-white px-2 py-1.5 rounded font-bold hover:bg-gray-700 shadow-sm">&larr;</button>
                    )}
                    {!isMain && onMakeExistingMain && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onMakeExistingMain(index); }} className="text-[10px] bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-gray-200 shadow-sm uppercase tracking-wide">Make Main</button>
                    )}
                    {onMoveExistingRight && index < existingImages.length - 1 && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onMoveExistingRight(index); }} className="text-[10px] bg-gray-800/80 text-white px-2 py-1.5 rounded font-bold hover:bg-gray-700 shadow-sm">&rarr;</button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveExisting(index); }}
                    className="text-[10px] bg-red-500 text-white px-3 py-1.5 rounded font-bold hover:bg-red-600 shadow-sm uppercase tracking-wide"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {/* New Files */}
          {files.map((file, index) => (
            <FileThumbnail
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              index={index}
              isMain={existingImages.length === 0 && index === 0}
              onMovePhotoLeft={index > 0 ? () => onMovePhotoLeft?.(index) : null}
              onMovePhotoRight={index < files.length - 1 ? () => onMovePhotoRight?.(index) : null}
              onRemoveFile={() => onRemoveFile(index)}
            />
          ))}

        </div>
      )}
    </div>
  );
}

export default function EditCarPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      make: '', model: '', manufacturingYear: '', registerYear: '', price: '',
      kmDriven: '', fuelType: '', transmission: '', ownership: '', insurance: '',
      bodyType: '', variant: '', color: '', registration: '', description: '',
      isCertified: false, isPetipack: false, validVimo: false, loanAvailable: false, isKmGenuine: false,
      features: [{ key: '', value: '' }],
    }
  });

  const isCertified = watch('isCertified');
  const isPetipack = watch('isPetipack');
  const validVimo = watch('validVimo');
  const loanAvailable = watch('loanAvailable');

  const [existingImages, setExistingImages] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.get('/brands');
        setBrands(res.data);
      } catch (err) {
        console.error('Failed to fetch brands');
      }
    };
    fetchBrands();
  }, []);

  const selectedMake = watch('make');
  const selectedBrandObj = brands.find(b => b.name === selectedMake);
  const modelsForSelectedMake = selectedBrandObj ? selectedBrandObj.models : [];

  useEffect(() => {
    if (!id) return;
    const abortController = new AbortController();

    const fetchCar = async () => {
      try {
        const res = await api.get(`/cars/${id}`, { signal: abortController.signal });
        const data = res.data;
        const badges = data.badges || [];

        reset({
          make: data.make || '', model: data.model || '',
          manufacturingYear: data.year || data.manufacturingYear || '',
          registerYear: data.registerYear || '', price: data.price || '',
          kmDriven: data.kms || '', fuelType: data.fuelType || '',
          transmission: data.transmission || '', ownership: data.owner || '', insurance: data.insurance || '',
          bodyType: data.bodyType || '', variant: data.variant || '',
          color: data.color || '', registration: data.registration || '',
          description: data.description || '',
          isCertified: badges.includes('Certified'),
          isPetipack: badges.includes('Peti-pack'),
          validVimo: badges.includes('Valid Vimo'),
          loanAvailable: data.loanAvailable === 'true' || data.loanAvailable === true,
          isKmGenuine: data.isKmGenuine === 'true' || data.isKmGenuine === true,
          features: Array.isArray(data.features) && data.features.length > 0
            ? data.features.map(f => typeof f === 'string' ? { key: f, value: '' } : f)
            : [{ key: '', value: '' }],
        });

        if (data.images && data.images.length > 0) {
          setExistingImages(data.images);
        }
      } catch (err) {
        if (err.name !== 'CanceledError') {
          toast.error('Failed to load car data');
        }
      }
    };
    fetchCar();

    return () => {
      abortController.abort();
    };
  }, [id, reset]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append('make', data.make);
      formData.append('model', data.model);
      if (data.manufacturingYear) {
        formData.append('manufacturingYear', data.manufacturingYear);
        formData.append('year', data.manufacturingYear);
      }
      if (data.registerYear) formData.append('registerYear', data.registerYear);
      if (data.price) formData.append('price', String(data.price).replace(/,/g, ''));
      if (data.kmDriven) formData.append('kms', String(data.kmDriven).replace(/,/g, ''));
      if (data.fuelType) formData.append('fuelType', data.fuelType);
      if (data.transmission) formData.append('transmission', data.transmission);
      if (data.ownership) formData.append('owner', data.ownership);
      if (data.insurance) formData.append('insurance', data.insurance);
      formData.append('bodyType', data.bodyType);
      if (data.variant) formData.append('variant', data.variant);
      formData.append('color', data.color);
      formData.append('registration', data.registration);
      formData.append('description', data.description);
      formData.append('status', 'available');

      const badges = [];
      if (data.isCertified) badges.push('Certified');
      if (data.isPetipack) badges.push('Peti-pack');
      if (data.validVimo) badges.push('Valid Vimo');

      let uploadedImages = [];
      let newPhotosToUpload = photos;
      if (newPhotosToUpload.length > 0) {
        toast.loading(`Preparing and uploading ${newPhotosToUpload.length} new photos...`, { id: 'upload-toast' });
        
        for (let i = 0; i < newPhotosToUpload.length; i++) {
          let photo = newPhotosToUpload[i];
          toast.loading(`Uploading new photo ${i + 1}/${newPhotosToUpload.length}...`, { id: 'upload-toast' });

          const compressed = await compressImage(photo);
          const uploadData = new FormData();
          uploadData.append('image', compressed);
          
          const uploadRes = await api.post('/upload/r2', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });

          if (!uploadRes.data?.success) {
            throw new Error(uploadRes.data?.message || `Failed to upload photo ${i + 1}`);
          }

          uploadedImages.push({
            url: uploadRes.data.url,
            publicId: uploadRes.data.publicId
          });
        }
        toast.dismiss('upload-toast');
      }

      // Hard integrity check: ensure all photos were actually uploaded
      if (uploadedImages.length !== newPhotosToUpload.length) {
        throw new Error(`Incomplete upload: only ${uploadedImages.length} of ${newPhotosToUpload.length} new photos uploaded. Vehicle update aborted.`);
      }

      if (existingImages.length === 0 && uploadedImages.length === 0) {
        toast.error('Please ensure the car has at least one image.');
        return;
      }

      const payload = {
        make: data.make,
        model: data.model,
        manufacturingYear: data.manufacturingYear,
        year: data.manufacturingYear,
        registerYear: data.registerYear,
        price: data.price ? String(data.price).replace(/,/g, '') : undefined,
        kms: data.kmDriven ? String(data.kmDriven).replace(/,/g, '') : undefined,
        fuelType: data.fuelType || undefined,
        transmission: data.transmission || undefined,
        owner: data.ownership || undefined,
        insurance: data.insurance || undefined,
        bodyType: data.bodyType || undefined,
        variant: data.variant || undefined,
        color: data.color || undefined,
        registration: data.registration || undefined,
        description: data.description || undefined,
        status: 'available',
        badges: badges,
        loanAvailable: data.loanAvailable,
        isKmGenuine: data.isKmGenuine,
        features: (data.features || []).filter(f => f.key.trim() !== '').map(f => ({ key: f.key.trim(), value: f.value.trim() || 'Yes' })),
        deletedImages: deletedImages.length > 0 ? JSON.stringify(deletedImages) : undefined,
        images: [...existingImages, ...uploadedImages].map(img => ({ url: img.url, publicId: img.publicId }))
      };

      await toast.promise(api.put(`/cars/${id}`, payload, { headers: { 'Content-Type': 'application/json' } }), {
        loading: 'Updating vehicle...',
        success: 'Vehicle Updated Successfully!',
        error: 'Failed to update vehicle.',
      });

      router.push('/admin/inventory');
    } catch (error) {
      console.error('Failed to update car:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update vehicle');
    }
  };

  const addPhotos = (newFiles) => {
    const validImages = (newFiles || []).filter(file => {
      return file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|heic|heif)$/i.test(file.name);
    });

    if (validImages.length === 0) {
      toast.error('Please select valid image files');
      return;
    }

    setPhotos((prev) => {
      const remaining = 25 - (existingImages.length + prev.length);
      if (remaining <= 0) {
        toast.error('Maximum 25 photos limit reached');
        return prev;
      }
      if (validImages.length > remaining) {
        toast.error(`Maximum 25 photos allowed. Added ${remaining} of ${validImages.length} selected photos.`);
        return [...prev, ...validImages.slice(0, remaining)];
      }
      return [...prev, ...validImages];
    });
  };
  const removePhoto = (index) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const removeExistingPhoto = (index) => {
    const imageToRemove = existingImages[index];
    if (imageToRemove?.publicId) {
      setDeletedImages(prev => [...prev, imageToRemove.publicId]);
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveExistingLeft = (index) => {
    if (index === 0) return;
    setExistingImages((prev) => {
      const newImages = [...prev];
      const temp = newImages[index - 1];
      newImages[index - 1] = newImages[index];
      newImages[index] = temp;
      return newImages;
    });
  };

  const moveExistingRight = (index) => {
    if (index === existingImages.length - 1) return;
    setExistingImages((prev) => {
      const newImages = [...prev];
      const temp = newImages[index + 1];
      newImages[index + 1] = newImages[index];
      newImages[index] = temp;
      return newImages;
    });
  };

  const makeExistingMain = (index) => {
    if (index === 0) return;
    setExistingImages((prev) => {
      const newImages = [...prev];
      const [moved] = newImages.splice(index, 1);
      newImages.unshift(moved);
      return newImages;
    });
  };

  const movePhotoLeft = (index) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const newPhotos = [...prev];
      const temp = newPhotos[index - 1];
      newPhotos[index - 1] = newPhotos[index];
      newPhotos[index] = temp;
      return newPhotos;
    });
  };

  const movePhotoRight = (index) => {
    if (index === photos.length - 1) return;
    setPhotos((prev) => {
      const newPhotos = [...prev];
      const temp = newPhotos[index + 1];
      newPhotos[index + 1] = newPhotos[index];
      newPhotos[index] = temp;
      return newPhotos;
    });
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-24">
      {/* Page Title */}
      <div className="mb-8">
        <Link href="/admin/inventory" className="inline-flex items-center gap-2 font-body text-sm text-text-muted hover:text-primary mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Inventory
        </Link>
        <h1 className="font-heading font-bold text-2xl text-text">Edit Vehicle</h1>
        <p className="font-body text-sm text-text-muted mt-1">
          Update the details of the car.
        </p>
      </div>

      <div className="space-y-8">
        {/* ── Section 1: Basic Details ── */}
        <section className="bg-surface rounded-2xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-primary">1</span>
            </div>
            <h2 className="font-heading font-bold text-lg text-text">Basic Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FormSelect
              label="Make"
              register={register('make', { required: 'Make is required' })}
              error={errors.make}
              placeholder="Select Make"
              options={brands.map(b => b.name)}
            />
            {modelsForSelectedMake.length > 0 ? (
              <FormSelect
                label="Model"
                register={register('model', { required: 'Model is required' })}
                error={errors.model}
                placeholder="Select Model"
                options={modelsForSelectedMake}
              />
            ) : (
              <FormSelect
                label="Model"
                register={register('model', { required: 'Model is required' })}
                error={errors.model}
                placeholder={selectedMake ? "No models added for this Make" : "Select Make first"}
                options={[]}
              />
            )}
            <FormInput label="Mfg. Year" type="number" register={register('manufacturingYear', { min: { value: 1990, message: 'Invalid year' } })} error={errors.manufacturingYear} placeholder="e.g. 2022" />
            <FormInput label="Reg. Year" type="number" register={register('registerYear', { min: { value: 1990, message: 'Invalid year' } })} error={errors.registerYear} placeholder="e.g. 2023" />
            <FormInput label="Price" type="text" register={register('price', { validate: v => !v || !isNaN(Number(String(v).replace(/,/g, ''))) || 'Invalid price' })} error={errors.price} placeholder="e.g. 5,85,000" prefix="₹" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-body text-sm font-semibold text-text">KMs Driven</label>
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${watch('isKmGenuine') ? 'bg-[#10b981] border-[#10b981]' : 'border-gray-300 bg-background group-hover:border-[#10b981]/50'}`}>
                    <CheckCircle2 className={`w-2.5 h-2.5 text-white ${watch('isKmGenuine') ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                  <input type="checkbox" {...register('isKmGenuine')} className="hidden" />
                  <span className="font-body text-[11px] font-bold text-text-muted group-hover:text-text transition-colors uppercase tracking-wider">Genuine?</span>
                </label>
              </div>
              <input type="text" {...register('kmDriven', { validate: v => !v || !isNaN(Number(String(v).replace(/,/g, ''))) || 'Invalid KMs' })} placeholder="e.g. 23,000" className={`w-full px-4 py-3 bg-background border ${errors.kmDriven ? 'border-red-500' : 'border-transparent'} focus:border-primary/30 rounded-xl font-body text-sm text-text placeholder:text-text-muted/50 outline-none transition-all focus:ring-2 focus:ring-primary/10`} />
              {watch('isKmGenuine') && <p className="mt-1 font-body text-[11px] font-bold text-[#10b981] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Genuine</p>}
              {errors.kmDriven && <span className="text-red-500 text-xs font-body">{errors.kmDriven.message}</span>}
            </div>

            <FormSelect label="Fuel Type" register={register('fuelType')} error={errors.fuelType} placeholder="Select fuel type" options={['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']} />
            <FormSelect label="Transmission" register={register('transmission')} error={errors.transmission} placeholder="Select transmission" options={['Manual', 'Automatic']} />
            <FormSelect label="Ownership" register={register('ownership')} error={errors.ownership} placeholder="Select ownership" options={['1st Owner', '2nd Owner', '3rd Owner', '4th Owner+', 'Unregistered']} />
            <FormInput label="Insurance" register={register('insurance')} error={errors.insurance} placeholder="e.g. Comprehensive, Third Party, etc." />
            <FormSelect label="Body Type" register={register('bodyType')} error={errors.bodyType} placeholder="e.g. SUV" options={['SUV', 'Sedan', 'Hatchback', 'MUV', 'Coupe', 'Convertible']} />
            <FormInput label="Variant" register={register('variant')} error={errors.variant} placeholder="e.g. LXI, VXI, Top" />
            <FormInput label="Color" register={register('color')} error={errors.color} placeholder="e.g. Polar White" />
            <FormInput label="Registration" register={register('registration')} error={errors.registration} placeholder="e.g. GJ-05" />
          </div>

          <div className="grid grid-cols-1 gap-5 mt-5">
            <FormTextarea label="Description" register={register('description')} error={errors.description} placeholder="Detailed description of the car..." rows={4} />
          </div>
        </section>

        {/* ── Section 2: Features ── */}
        <section className="bg-surface rounded-2xl border border-gray-100 p-6 sm:p-8 mt-8">
          <FeatureManager control={control} register={register} errors={errors} />
        </section>

        {/* ── Section 3: Vehicle Badges ── */}
        <section className="bg-surface rounded-2xl border border-gray-100 p-6 sm:p-8 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-primary">3</span>
            </div>
            <h2 className="font-heading font-bold text-lg text-text">Vehicle Badges</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ToggleSwitch label="Is Certified?" description="Vehicle has passed our multi-point inspection" checked={isCertified} onChange={(val) => setValue('isCertified', val)} />
            <ToggleSwitch label="Is Peti-pack?" description="All body panels are original with no dent or paint" checked={isPetipack} onChange={(val) => setValue('isPetipack', val)} />
            <ToggleSwitch label="Valid Vimo?" description="Vehicle has valid insurance coverage" checked={validVimo} onChange={(val) => setValue('validVimo', val)} />
            <ToggleSwitch label="Loan Available?" description="Car loan / EMI options can be arranged" checked={loanAvailable} onChange={(val) => setValue('loanAvailable', val)} />
          </div>

          {/* Active Badges Preview */}
          {(isCertified || isPetipack || validVimo) && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-100">
              <span className="font-body text-xs text-text-muted font-semibold mr-2 self-center">Active badges:</span>
              {isCertified && <span className="flex items-center gap-1 px-3 py-1.5 bg-[#10b981]/10 text-[#059669] rounded-full font-body text-xs font-bold ring-1 ring-[#10b981]/20"><CheckCircle2 className="w-3 h-3" /> Certified</span>}
              {isPetipack && <span className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full font-body text-xs font-bold ring-1 ring-primary/20"><CheckCircle2 className="w-3 h-3" /> Peti-pack</span>}
              {validVimo && <span className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-full font-body text-xs font-bold ring-1 ring-accent/20"><CheckCircle2 className="w-3 h-3" /> Valid Vimo</span>}
            </div>
          )}
        </section>

        {/* ── Section 4: Media Upload ── */}
        <section className="bg-surface rounded-2xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-primary">4</span>
            </div>
            <h2 className="font-heading font-bold text-lg text-text">Media Upload</h2>
          </div>

          <div className="space-y-8">
            <DropZone
              id="standard-photos"
              title={`Exterior & Interior Photos (${existingImages.length + photos.length}/25 total)`}
              description="Upload high-quality JPG, PNG or WebP images. Up to 25 photos supported. Recommended: 1200×800px or higher."
              icon={ImageIcon}
              accept="image/*"
              existingImages={existingImages}
              onRemoveExisting={removeExistingPhoto}
              onMoveExistingLeft={moveExistingLeft}
              onMoveExistingRight={moveExistingRight}
              onMakeExistingMain={makeExistingMain}
              files={photos}
              onFilesAdded={addPhotos}
              onRemoveFile={removePhoto}
              onMovePhotoLeft={movePhotoLeft}
              onMovePhotoRight={movePhotoRight}
            />
          </div>
        </section>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-surface/80 backdrop-blur-xl border-t border-gray-100 z-30">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-2 font-body text-sm text-text-muted">
            {Object.keys(errors).length > 0 ? (
              <span className="flex items-center gap-2 text-red-500 font-semibold">
                <AlertCircle className="w-4 h-4" />
                Missing required fields.
              </span>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Fill all required fields before updating.</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-body text-sm font-bold transition-all shadow-lg shadow-accent/25 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Vehicle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
