import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Images, Plus, Check, X, ChevronLeft, Upload, Clock } from 'lucide-react';
import { galleryApi } from '../../api/gallery.api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { uploadImage } from '../../utils/uploadImage';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'];

export default function GalleryPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = ADMIN_ROLES.includes(user?.role || '');

  const [activeAlbum, setActiveAlbum] = useState<any>(null);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const albumForm = useForm();
  const imageForm = useForm();

  const { data: albums, isLoading } = useQuery({
    queryKey: ['gallery-albums'],
    queryFn: () => galleryApi.getAlbums().then((r) => r.data.data),
  });

  const { data: albumDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['gallery-album', activeAlbum?.id],
    queryFn: () => galleryApi.getAlbum(activeAlbum!.id).then((r) => r.data.data),
    enabled: !!activeAlbum,
  });

  const { data: pending } = useQuery({
    queryKey: ['gallery-pending'],
    queryFn: () => galleryApi.getPending().then((r) => r.data.data),
    enabled: isAdmin && showPending,
  });

  const createAlbumMutation = useMutation({
    mutationFn: (data: any) => galleryApi.createAlbum(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery-albums'] });
      qc.invalidateQueries({ queryKey: ['gallery-pending'] });
      setShowCreateAlbum(false);
      albumForm.reset();
      setCoverFile(null);
      toast.success('Album submitted for approval');
    },
    onError: () => toast.error('Failed to create album'),
  });

  const addImageMutation = useMutation({
    mutationFn: ({ albumId, data }: { albumId: string; data: any }) => galleryApi.addImage(albumId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery-album', activeAlbum?.id] });
      qc.invalidateQueries({ queryKey: ['gallery-pending'] });
      setShowAddImage(false);
      imageForm.reset();
      setImageFile(null);
      toast.success('Image submitted for approval');
    },
    onError: () => toast.error('Failed to add image'),
  });

  const approveAlbumMutation = useMutation({
    mutationFn: (id: string) => galleryApi.approveAlbum(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery-albums'] }); qc.invalidateQueries({ queryKey: ['gallery-pending'] }); toast.success('Album approved'); },
    onError: () => toast.error('Failed'),
  });

  const rejectAlbumMutation = useMutation({
    mutationFn: (id: string) => galleryApi.rejectAlbum(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery-albums'] }); qc.invalidateQueries({ queryKey: ['gallery-pending'] }); toast.success('Album rejected'); },
    onError: () => toast.error('Failed'),
  });

  const approveImageMutation = useMutation({
    mutationFn: (id: string) => galleryApi.approveImage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery-album', activeAlbum?.id] }); qc.invalidateQueries({ queryKey: ['gallery-pending'] }); toast.success('Image approved'); },
    onError: () => toast.error('Failed'),
  });

  const rejectImageMutation = useMutation({
    mutationFn: (id: string) => galleryApi.rejectImage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gallery-album', activeAlbum?.id] }); qc.invalidateQueries({ queryKey: ['gallery-pending'] }); toast.success('Image rejected'); },
    onError: () => toast.error('Failed'),
  });

  const handleCreateAlbum = async (data: any) => {
    setUploading(true);
    try {
      let coverImage: string | undefined;
      if (coverFile) coverImage = await uploadImage(coverFile, 'gallery');
      await createAlbumMutation.mutateAsync({ ...data, coverImage });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAddImage = async (data: any) => {
    if (!imageFile) { toast.error('Please select an image'); return; }
    setUploading(true);
    try {
      const imageUrl = await uploadImage(imageFile, 'gallery');
      await addImageMutation.mutateAsync({ albumId: activeAlbum!.id, data: { ...data, imageUrl } });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = (pending?.albums?.length || 0) + (pending?.images?.length || 0);

  if (isLoading) return <PageLoader />;

  // Album detail view
  if (activeAlbum) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setActiveAlbum(null)}>Back</Button>
            <div>
              <h1 className="page-title">{albumDetail?.title || activeAlbum.title}</h1>
              {albumDetail?.description && <p className="text-sm text-slate-500 mt-0.5">{albumDetail.description}</p>}
            </div>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setShowAddImage(true)}>Add Photo</Button>
        </div>

        {loadingDetail ? <PageLoader /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {albumDetail?.images?.map((img: any) => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square bg-surface-100 dark:bg-surface-800">
                <img src={img.imageUrl} alt={img.caption || ''} className="w-full h-full object-cover" />
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{img.caption}</p>
                  </div>
                )}
                {isAdmin && !img.isApproved && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                    <span className="text-white text-xs font-medium bg-amber-500 px-2 py-0.5 rounded">Pending</span>
                    <div className="flex gap-1">
                      <button onClick={() => approveImageMutation.mutate(img.id)} className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center"><Check size={13} /></button>
                      <button onClick={() => rejectImageMutation.mutate(img.id)} className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"><X size={13} /></button>
                    </div>
                  </div>
                )}
                {!img.isApproved && !isAdmin && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={10} /> Pending
                  </div>
                )}
              </div>
            ))}
            {(!albumDetail?.images || albumDetail.images.length === 0) && (
              <div className="col-span-full">
                <EmptyState icon={Images} title="No photos yet" description="Add the first photo to this album" action={<Button icon={<Plus size={16} />} onClick={() => setShowAddImage(true)}>Add Photo</Button>} />
              </div>
            )}
          </div>
        )}

        {/* Add Image Modal */}
        <Modal isOpen={showAddImage} onClose={() => { setShowAddImage(false); imageForm.reset(); setImageFile(null); }} title="Add Photo">
          <form onSubmit={imageForm.handleSubmit(handleAddImage)} className="space-y-4">
            <div>
              <label className="label">Photo</label>
              <div
                className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
                onClick={() => imageRef.current?.click()}
              >
                {imageFile ? (
                  <div className="space-y-2">
                    <img src={URL.createObjectURL(imageFile)} alt="" className="w-full h-48 object-cover rounded-lg mx-auto" />
                    <p className="text-xs text-slate-500">{imageFile.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={28} className="mx-auto text-slate-400" />
                    <p className="text-sm text-slate-500">Click to select a photo</p>
                    <p className="text-xs text-slate-400">JPG, PNG, WebP up to 5MB</p>
                  </div>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            <Input label="Caption (optional)" placeholder="Describe this photo..." {...imageForm.register('caption')} />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" type="button" onClick={() => { setShowAddImage(false); imageForm.reset(); setImageFile(null); }}>Cancel</Button>
              <Button type="submit" loading={uploading || addImageMutation.isPending}>Upload</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Albums list view
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gallery</h1>
          <p className="text-sm text-slate-500 mt-1">Community photo albums</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowPending(!showPending)}>
              Pending {pendingCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>}
            </Button>
          )}
          <Button icon={<Plus size={16} />} onClick={() => setShowCreateAlbum(true)}>New Album</Button>
        </div>
      </div>

      {/* Pending approval panel (admin only) */}
      {isAdmin && showPending && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Pending Approval</h2>

          {pending?.albums?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Albums</p>
              <div className="space-y-2">
                {pending.albums.map((album: any) => (
                  <div key={album.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{album.title}</p>
                      <p className="text-xs text-slate-400">by {album.creator?.fullName}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" icon={<Check size={13} />} onClick={() => approveAlbumMutation.mutate(album.id)} loading={approveAlbumMutation.isPending}>Approve</Button>
                      <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => rejectAlbumMutation.mutate(album.id)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending?.images?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Images</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pending.images.map((img: any) => (
                  <div key={img.id} className="relative rounded-xl overflow-hidden aspect-square bg-surface-100 dark:bg-surface-800">
                    <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
                      <p className="text-white text-xs truncate">{img.album?.title}</p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => approveImageMutation.mutate(img.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-0.5 rounded flex items-center justify-center gap-1"><Check size={10} /> OK</button>
                        <button onClick={() => rejectImageMutation.mutate(img.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 rounded flex items-center justify-center gap-1"><X size={10} /> No</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!pending?.albums?.length && !pending?.images?.length) && (
            <p className="text-sm text-slate-400 text-center py-4">Nothing pending approval.</p>
          )}
        </div>
      )}

      {/* Albums grid */}
      {albums?.length === 0 ? (
        <div className="card p-8">
          <EmptyState icon={Images} title="No albums yet" description="Create the first community photo album" action={<Button icon={<Plus size={16} />} onClick={() => setShowCreateAlbum(true)}>New Album</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums?.map((album: any) => (
            <div
              key={album.id}
              className="card overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => setActiveAlbum(album)}
            >
              <div className="aspect-video bg-surface-100 dark:bg-surface-800 overflow-hidden relative">
                {album.coverImage ? (
                  <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Images size={40} className="text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                {!album.isApproved && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={10} /> Pending
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{album.title}</h3>
                {album.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{album.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-400">by {album.creator?.fullName}</p>
                  <p className="text-xs text-slate-400">{album.imageCount} photo{album.imageCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      <Modal isOpen={showCreateAlbum} onClose={() => { setShowCreateAlbum(false); albumForm.reset(); setCoverFile(null); }} title="Create Album">
        <form onSubmit={albumForm.handleSubmit(handleCreateAlbum)} className="space-y-4">
          <Input label="Album Title" placeholder="e.g. Annual Gathering 2025" {...albumForm.register('title', { required: true })} />
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input" rows={2} placeholder="What's this album about?" {...albumForm.register('description')} />
          </div>
          <div>
            <label className="label">Cover Photo (optional)</label>
            <div
              className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500 transition-colors"
              onClick={() => coverRef.current?.click()}
            >
              {coverFile ? (
                <div className="space-y-1">
                  <img src={URL.createObjectURL(coverFile)} alt="" className="w-full h-32 object-cover rounded-lg" />
                  <p className="text-xs text-slate-500">{coverFile.name}</p>
                </div>
              ) : (
                <div className="space-y-1 py-2">
                  <Upload size={24} className="mx-auto text-slate-400" />
                  <p className="text-xs text-slate-500">Click to select cover photo</p>
                </div>
              )}
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">Your album will be reviewed by an admin before it appears publicly.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => { setShowCreateAlbum(false); albumForm.reset(); setCoverFile(null); }}>Cancel</Button>
            <Button type="submit" loading={uploading || createAlbumMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
