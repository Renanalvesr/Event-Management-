import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Organization } from '../models/organization.model';

const ORGANIZATIONS_KEY = 'capoeira_organizations';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private _cache: Organization[] = this._load();

  getOrganizations(): Observable<Organization[]> {
    return of(this._cache).pipe(delay(200));
  }

  getRootOrganizations(): Observable<Organization[]> {
    return of(this._cache.filter(o => o.parentOrganizationId === null)).pipe(delay(200));
  }

  getUnitsByParentId(parentOrgId: number): Observable<Organization[]> {
    return of(this._cache.filter(o => o.parentOrganizationId === parentOrgId)).pipe(delay(200));
  }

  getById(id: number): Observable<Organization | undefined> {
    return of(this._cache.find(o => o.id === id)).pipe(delay(200));
  }

  getByJoinCode(joinCode: string): Organization | undefined {
    const normalized = joinCode.trim().toUpperCase();
    return normalized ? this._cache.find(o => o.joinCode === normalized) : undefined;
  }

  getByIdSync(id: number): Organization | undefined {
    return this._cache.find(o => o.id === id);
  }

  getOrganizationFamilySync(orgId: number): number[] {
    const org = this._cache.find(o => o.id === orgId);
    if (!org) return [orgId];
    const rootId = org.parentOrganizationId ?? org.id;
    return this._cache
      .filter(o => o.id === rootId || o.parentOrganizationId === rootId)
      .map(o => o.id);
  }

  createOrganization(payload: {
    name: string; description?: string;
    city: string; state: string; country?: string;
  }): { success: boolean; message: string; organization?: Organization } {
    const name  = payload.name.trim();
    const city  = payload.city.trim();
    const state = payload.state.trim().toUpperCase();
    if (!name || !city || !state) {
      return { success: false, message: 'Preencha nome, cidade e estado para criar a organização.' };
    }
    const id   = this._nextId();
    const slug = this._nextUniqueSlug(this._toSlug(name) || 'grupo-capoeira');
    const organization: Organization = {
      id, parentOrganizationId: null,
      name, slug,
      description: payload.description?.trim() || `Grupo ${name}`,
      city, state, country: payload.country?.trim() || 'Brasil',
      address: '', contactPhone: '', contactEmail: '',
      joinCode: this._nextJoinCode(name),
      logoUrl: this._defaultLogoForName(name), active: true
    };
    this._cache = [...this._cache, organization];
    this._save();
    return { success: true, message: 'Organização criada com sucesso!', organization };
  }

  createUnit(parentOrgId: number, payload: {
    name: string; description?: string;
    city: string; state: string; country?: string;
  }): { success: boolean; message: string; organization?: Organization } {
    const parent = this._cache.find(o => o.id === parentOrgId);
    if (!parent) return { success: false, message: 'Organização pai não encontrada.' };
    if (parent.parentOrganizationId !== null) {
      return { success: false, message: 'Não é possível criar unidades de uma unidade.' };
    }
    const name  = payload.name.trim();
    const city  = payload.city.trim();
    const state = payload.state.trim().toUpperCase();
    if (!name || !city || !state) {
      return { success: false, message: 'Preencha nome, cidade e estado para criar a unidade.' };
    }
    const id   = this._nextId();
    const slug = this._nextUniqueSlug(this._toSlug(name) || 'unidade-capoeira');
    const unit: Organization = {
      id, parentOrganizationId: parentOrgId,
      name, slug,
      description: payload.description?.trim() || `Unidade ${name}`,
      city, state, country: payload.country?.trim() || 'Brasil',
      address: '', contactPhone: '', contactEmail: '',
      joinCode: this._nextJoinCode(name),
      logoUrl: this._defaultLogoForName(name), active: true
    };
    this._cache = [...this._cache, unit];
    this._save();
    return { success: true, message: `Unidade "${name}" criada com sucesso!`, organization: unit };
  }

  private _load(): Organization[] {
    let persisted: Organization[] = [];
    try {
      const raw = localStorage.getItem(ORGANIZATIONS_KEY);
      if (raw) persisted = JSON.parse(raw) as Organization[];
    } catch {
      persisted = [];
    }
    const merged = this._normalizeOrganizations(persisted);
    localStorage.setItem(ORGANIZATIONS_KEY, JSON.stringify(merged));
    return merged;
  }

  private _normalizeOrganizations(orgs: Organization[]): Organization[] {
    const migrated: Organization[] = orgs.map(o => {
      const raw = o as unknown as Record<string, unknown>;
      const withParent = !('parentOrganizationId' in raw) ? { ...o, parentOrganizationId: null } : o;
      return this._withDefaultLogo(withParent);
    });
    return migrated.sort((a, b) => a.id - b.id);
  }

  private _withDefaultLogo(org: Organization): Organization {
    if (org.logoUrl) return org;
    return { ...org, logoUrl: this._defaultLogoForName(org.name) };
  }

  private _save(): void {
    localStorage.setItem(ORGANIZATIONS_KEY, JSON.stringify(this._cache));
  }

  private _nextId(): number {
    const ids = this._cache.map(o => o.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  private _nextJoinCode(name: string): string {
    const seed = this._toSlug(name).replace(/-/g, '').toUpperCase().slice(0, 6) || 'GRUPO';
    let index = this._cache.length + 2026;
    let code  = `${seed}${index}`;
    while (this._cache.some(o => o.joinCode === code)) { index++; code = `${seed}${index}`; }
    return code;
  }

  private _nextUniqueSlug(base: string): string {
    let slug = base, suffix = 2;
    while (this._cache.some(o => o.slug === slug)) { slug = `${base}-${suffix}`; suffix++; }
    return slug;
  }

  private _toSlug(value: string): string {
    return value
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private _defaultLogoForName(name: string): string {
    const seed = encodeURIComponent(name.trim().slice(0, 18) || 'Grupo');
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1a237e&fontColor=ffffff`;
  }
}
